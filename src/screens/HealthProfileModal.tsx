import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Calendar, 
  Activity, 
  MapPin, 
  User, 
  Pill,
  Heart, 
  Plus, 
  Edit3, 
  Check, 
  Loader2,
  Phone,
  AlertCircle,
  FileText,
  Camera,
  UploadCloud,
  Sparkles,
  Eye,
  Trash2,
  Stethoscope,
  Building2,
  AlertTriangle,
  ZoomIn,
  ShieldCheck,
  ClipboardList,
  Share2,
  Printer,
  Copy,
  CheckCheck,
  QrCode
} from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import ElderlyCameraCaptureModal from "../components/ElderlyCameraCaptureModal";
import { getActiveMedications, type ActiveMedicationItem } from "../services/medicationService";
import {
  saveMedicalDocument,
  getMedicalDocuments,
  deleteMedicalDocument,
  uploadMedicalDocumentImage,
  getDocumentTypeInfo,
  type MedicalDocumentRecord,
  type MedicalDocType
} from "../services/medicalDocumentService";
import {
  analyzeMedicalDocument,
  MEDICAL_DOC_FALLBACK_RESULT,
  type MedicalDocumentAnalysisResult
} from "../utils/geminiVision";
import {
  playScannerStartSound,
  playScannerPulseSound,
  playScannerSuccessSound,
  playScannerErrorSound
} from "../utils/scannerSoundEffects";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdated?: () => void;
}

export default function HealthProfileModal({ isOpen, onClose, user, onUpdated }: Props) {
  const meta = user?.user_metadata || {};
  const patientId = user?.id || "current_patient";
  const fullName = meta.full_name || meta.name || (user?.email ? user.email.split('@')[0] : "Bệnh nhân");

  // Tab chuyển đổi: Chỉ số & Bệnh nền vs Tài liệu y tế & Phẫu thuật
  const [activeTab, setActiveTab] = useState<"vitals" | "documents">("vitals");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // States xuất hồ sơ y tế cho Bác sĩ & Cấp cứu
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeMedicationsList, setActiveMedicationsList] = useState<ActiveMedicationItem[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  // Form states cho thông tin sinh trắc
  const [height, setHeight] = useState<number | string>(meta.height || 165);
  const [weight, setWeight] = useState<number | string>(meta.weight || 62);
  const [bloodType, setBloodType] = useState<string>(meta.blood_type || "O");
  const [dob, setDob] = useState<string>(meta.dob || "1955-06-15");
  const [gender, setGender] = useState<string>(meta.gender || "Nam");
  const [address, setAddress] = useState<string>(meta.address || "Hà Nội, Việt Nam");
  const [emergencyPhone, setEmergencyPhone] = useState<string>(meta.emergency_phone || "0901 234 567");
  const [allergies, setAllergies] = useState<string>(meta.allergies || "Không có dị ứng thuốc");

  const [diseases, setDiseases] = useState<string[]>(
    meta.chronic_diseases && Array.isArray(meta.chronic_diseases)
      ? meta.chronic_diseases
      : ["Cao huyết áp", "Tiểu đường tuýp 2"]
  );
  const [newDiseaseInput, setNewDiseaseInput] = useState("");

  // ================= Quản lý Kho Tài Liệu Y Tế (AI) =================
  const [medicalDocs, setMedicalDocs] = useState<MedicalDocumentRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | MedicalDocType>("all");
  const [selectedDocForView, setSelectedDocForView] = useState<MedicalDocumentRecord | null>(null);
  const [isZoomImageOpen, setIsZoomImageOpen] = useState(false);

  // Trạng thái quét tài liệu mới
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [scanDocProgress, setScanDocProgress] = useState(0);
  const [scanDocStage, setScanDocStage] = useState("Đang chuẩn bị ảnh...");
  const [scanDocError, setScanDocError] = useState<string | null>(null);
  const [capturedDocFile, setCapturedDocFile] = useState<File | null>(null);
  const [capturedDocPreview, setCapturedDocPreview] = useState<string | null>(null);

  // Trạng thái duyệt và chỉnh sửa kết quả bóc tách
  const [isReviewingDoc, setIsReviewingDoc] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [autoAddChronicDisease, setAutoAddChronicDisease] = useState(true);

  // Form bóc tách tài liệu
  const [docFormData, setDocFormData] = useState<{
    docType: MedicalDocType;
    title: string;
    hospitalName: string;
    doctorName: string;
    date: string;
    diagnosis: string;
    procedureName: string;
    summary: string;
    treatmentPlan: string;
    cautions: string[];
    keyMetrics: string[];
  }>({
    docType: "consultation",
    title: "",
    hospitalName: "",
    doctorName: "",
    date: "",
    diagnosis: "",
    procedureName: "",
    summary: "",
    treatmentPlan: "",
    cautions: [],
    keyMetrics: []
  });

  // Tải danh sách tài liệu y tế và đơn thuốc đang dùng khi mở modal hoặc đổi bệnh nhân
  useEffect(() => {
    if (isOpen && patientId) {
      const docs = getMedicalDocuments(patientId);
      setMedicalDocs(docs);
      getActiveMedications(patientId).then(list => {
        setActiveMedicationsList(list);
      }).catch(err => console.warn("Lỗi tải thuốc đang dùng:", err));
    }
  }, [isOpen, patientId]);

  const handleCopyDoctorSummary = () => {
    const age = dob ? Math.floor((new Date().getTime() - new Date(dob).getTime()) / (365.25 * 24 * 3600000)) : "--";
    const medLines = activeMedicationsList.length > 0
      ? activeMedicationsList.map(m => `• ${m.name}: ${m.dosage || "1 liều"} (${m.instructions?.split('|')[1]?.trim() || (m.nextScheduledTime ? m.nextScheduledTime.substring(11, 16) : "Theo đơn")}) - ${m.instructions?.split('|')[0] || "Uống theo đơn"}`).join('\n')
      : "• Không có thuốc nào đang cài đặt";

    const docLines = medicalDocs.length > 0
      ? medicalDocs.slice(0, 3).map(d => `• [${d.date}] ${d.title} (${d.hospitalName}): ${d.diagnosis || d.summary}`).join('\n')
      : "• Chưa có hồ sơ khám/mổ trước đó";

    const text = `🏥 [HỒ SƠ TÓM TẮT Y KHOA & CẤP CỨU - HEYMEDI]
Bệnh nhân: Bác ${fullName.replace(/^bác\s+/i, '')}
Tuổi / Ngày sinh: ${age} tuổi (${dob}) | Giới tính: ${gender}
Nhóm máu: ${bloodType}
Liên hệ khẩn cấp: ${emergencyPhone} (${meta.emergency_contact_name || "Người nhà"})
Địa chỉ: ${address}

🚨 CẢNH BÁO DỊ ỨNG THUỐC (QUAN TRỌNG):
${allergies || "Chưa ghi nhận dị ứng thuốc"}

🩺 TIỀN SỬ BỆNH LÝ NỀN / MÃN TÍNH:
${diseases.length > 0 ? diseases.join(', ') : "Không có bệnh nền mãn tính"}

💊 DANH SÁCH THUỐC ĐANG ĐIỀU TRỊ HIỆN TẠI:
${medLines}

📋 HỒ SƠ KHÁM BỆNH & PHẪU THUẬT GẦN NHẤT:
${docLines}
---
(Trích xuất từ Ứng dụng HeyMedi)`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handlePrintMedicalReport = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Tự động tính BMI
  const numHeight = Number(height);
  const numWeight = Number(weight);
  const bmiVal = (numHeight > 0 && numWeight > 0)
    ? (numWeight / Math.pow(numHeight / 100, 2)).toFixed(1)
    : "--";

  const numBmi = Number(bmiVal);
  let bmiCategory = "Bình thường";
  let bmiColor = "text-emerald-600 bg-emerald-50 border-emerald-200";

  if (!isNaN(numBmi)) {
    if (numBmi < 18.5) {
      bmiCategory = "Gầy (Thiếu cân)";
      bmiColor = "text-amber-600 bg-amber-50 border-amber-200";
    } else if (numBmi <= 24.9) {
      bmiCategory = "Chuẩn lý tưởng";
      bmiColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    } else if (numBmi <= 29.9) {
      bmiCategory = "Tiền béo phì (Thừa cân)";
      bmiColor = "text-orange-600 bg-orange-50 border-orange-200";
    } else {
      bmiCategory = "Béo phì (Cần chú ý)";
      bmiColor = "text-red-600 bg-red-50 border-red-200";
    }
  }

  const handleAddDisease = () => {
    if (newDiseaseInput.trim() && !diseases.includes(newDiseaseInput.trim())) {
      setDiseases(prev => [...prev, newDiseaseInput.trim()]);
      setNewDiseaseInput("");
    }
  };

  const handleRemoveDisease = (index: number) => {
    setDiseases(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const updateData = {
        height: Number(height),
        weight: Number(weight),
        blood_type: bloodType,
        dob,
        gender,
        address,
        emergency_phone: emergencyPhone,
        allergies,
        chronic_diseases: diseases
      };

      // Cập nhật Auth User Metadata
      await supabase.auth.updateUser({
        data: updateData
      });

      // Cập nhật thêm bảng profiles nếu có
      try {
        await supabase
          .from("profiles")
          .update({
            full_name: meta.full_name,
            address,
            phone: emergencyPhone
          })
          .eq("id", patientId);
      } catch {
        // ignore
      }

      alert("Đã cập nhật hồ sơ sức khỏe thành công!");
      setIsEditing(false);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error("Save profile error:", err);
      alert(err.message || "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  // ================= XỬ LÝ QUÉT TÀI LIỆU Y TẾ BẰNG AI =================
  const processDocumentFile = async (file: File, previewUrl: string) => {
    setCapturedDocFile(file);
    setCapturedDocPreview(previewUrl);
    setShowDocUploadModal(false);
    setScanDocError(null);
    setIsScanningDoc(true);
    setScanDocProgress(20);
    setScanDocStage("Đang nạp văn bản y tế & khử nhiễu...");

    // Hiệu ứng âm thanh quét laser radar
    playScannerStartSound();
    const pulseTimer = setInterval(() => {
      playScannerPulseSound();
    }, 420);

    const t1 = setTimeout(() => {
      setScanDocProgress(50);
      setScanDocStage("AI Gemini Vision đang bóc tách chẩn đoán & phẫu thuật...");
    }, 700);

    const t2 = setTimeout(() => {
      setScanDocProgress(80);
      setScanDocStage("Trích xuất chỉ số cận lâm sàng & phác đồ...");
    }, 1600);

    try {
      const result: MedicalDocumentAnalysisResult = await analyzeMedicalDocument(file);

      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(pulseTimer);

      if (result.isValidDocument === false) {
        playScannerErrorSound();
        setIsScanningDoc(false);
        setScanDocError(result.errorReason || "Ảnh chụp không phải là văn bản y tế hợp lệ. Vui lòng chụp rõ giấy ra viện, biên bản mổ hoặc phiếu khám.");
        setShowDocUploadModal(true);
        return;
      }

      playScannerSuccessSound();
      setScanDocProgress(100);
      setScanDocStage("Hoàn tất bóc tách y khoa!");

      // Đưa dữ liệu bóc tách vào form xem xét
      setDocFormData({
        docType: result.docType || "consultation",
        title: result.title || "Tài liệu y tế",
        hospitalName: result.hospitalName || "Hệ thống Y tế Quốc tế HeyMedi",
        doctorName: result.doctorName || "",
        date: result.date || new Date().toLocaleDateString("vi-VN"),
        diagnosis: result.diagnosis || "",
        procedureName: result.procedureName || "",
        summary: result.summary || "",
        treatmentPlan: result.treatmentPlan || "",
        cautions: result.cautions || [],
        keyMetrics: result.keyMetrics || []
      });

      setTimeout(() => {
        setIsScanningDoc(false);
        setIsReviewingDoc(true);
      }, 400);

    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(pulseTimer);
      playScannerErrorSound();
      setIsScanningDoc(false);
      setScanDocError(err?.message || "Có lỗi xảy ra khi phân tích tài liệu bằng AI.");
      setShowDocUploadModal(true);
    }
  };

  const handleUseDemoSurgerySample = () => {
    setShowDocUploadModal(false);
    setCapturedDocFile(null);
    setCapturedDocPreview(null);
    setDocFormData({
      docType: MEDICAL_DOC_FALLBACK_RESULT.docType,
      title: MEDICAL_DOC_FALLBACK_RESULT.title,
      hospitalName: MEDICAL_DOC_FALLBACK_RESULT.hospitalName,
      doctorName: MEDICAL_DOC_FALLBACK_RESULT.doctorName || "",
      date: MEDICAL_DOC_FALLBACK_RESULT.date,
      diagnosis: MEDICAL_DOC_FALLBACK_RESULT.diagnosis || "",
      procedureName: MEDICAL_DOC_FALLBACK_RESULT.procedureName || "",
      summary: MEDICAL_DOC_FALLBACK_RESULT.summary,
      treatmentPlan: MEDICAL_DOC_FALLBACK_RESULT.treatmentPlan || "",
      cautions: MEDICAL_DOC_FALLBACK_RESULT.cautions || [],
      keyMetrics: MEDICAL_DOC_FALLBACK_RESULT.keyMetrics || []
    });
    setIsReviewingDoc(true);
  };

  const handleSaveMedicalDoc = async () => {
    try {
      setIsSavingDoc(true);
      let uploadedUrl: string | undefined = undefined;

      if (capturedDocFile) {
        uploadedUrl = await uploadMedicalDocumentImage(capturedDocFile);
      } else if (capturedDocPreview) {
        uploadedUrl = capturedDocPreview;
      }

      await saveMedicalDocument(patientId, {
        type: docFormData.docType,
        title: docFormData.title || "Tài liệu y tế",
        imageUrl: uploadedUrl,
        date: docFormData.date || new Date().toLocaleDateString("vi-VN"),
        hospitalName: docFormData.hospitalName || "Cơ sở y tế",
        doctorName: docFormData.doctorName || undefined,
        diagnosis: docFormData.diagnosis || undefined,
        procedureName: docFormData.procedureName || undefined,
        summary: docFormData.summary || "Đã lưu trữ tài liệu y tế.",
        treatmentPlan: docFormData.treatmentPlan || undefined,
        cautions: docFormData.cautions,
        keyMetrics: docFormData.keyMetrics
      });

      // Tự động thêm chẩn đoán vào danh sách Bệnh nền nếu được chọn
      if (autoAddChronicDisease && docFormData.diagnosis && !diseases.includes(docFormData.diagnosis.trim())) {
        const updatedDiseases = [...diseases, docFormData.diagnosis.trim()];
        setDiseases(updatedDiseases);
        await supabase.auth.updateUser({
          data: { chronic_diseases: updatedDiseases }
        });
      }

      // Cập nhật lại danh sách tài liệu
      setMedicalDocs(getMedicalDocuments(patientId));
      setIsReviewingDoc(false);
      setCapturedDocFile(null);
      setCapturedDocPreview(null);
      alert("Đã lưu tài liệu vào Hồ sơ Y tế thành công!");
    } catch (err: any) {
      console.error("Save medical doc error:", err);
      alert("Lỗi khi lưu tài liệu: " + (err?.message || "Vui lòng thử lại"));
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDoc = (docId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài liệu y tế này khỏi hồ sơ không?")) {
      deleteMedicalDocument(patientId, docId);
      setMedicalDocs(getMedicalDocuments(patientId));
      if (selectedDocForView?.id === docId) {
        setSelectedDocForView(null);
      }
    }
  };

  const handleAddDiagnosisToDiseases = (diagnosisText: string) => {
    if (!diagnosisText) return;
    if (diseases.includes(diagnosisText)) {
      alert("Chẩn đoán này đã có trong danh sách bệnh nền!");
      return;
    }
    const updated = [...diseases, diagnosisText];
    setDiseases(updated);
    supabase.auth.updateUser({
      data: { chronic_diseases: updated }
    }).then(() => {
      alert(`Đã thêm "${diagnosisText}" vào Tiền sử bệnh nền!`);
    }).catch((err) => {
      console.error(err);
    });
  };

  const filteredDocs = medicalDocs.filter(d => {
    if (selectedFilter === "all") return true;
    return d.type === selectedFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-[#F4F7FB] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 bg-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF1FF] text-primary flex items-center justify-center font-bold">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1A2B4B]">Hồ sơ sức khỏe HeyMedi</h2>
              <p className="text-xs text-gray-400 font-medium">Bệnh án điện tử & Tài liệu khám chữa bệnh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Nút Xuất Hồ Sơ Y Khoa / Cấp Cứu cho Bác Sĩ */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-2xs active:scale-95"
              title="Xuất tóm tắt hồ sơ y tế cho bác sĩ xem hoặc theo dõi cấp cứu"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Xuất cho Bác sĩ</span>
              <span className="sm:hidden">Xuất HS</span>
            </button>

            {activeTab === "vitals" && (
              !isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 bg-[#EBF1FF] text-primary hover:bg-blue-100 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all"
                >
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              ) : (
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
                </button>
              )
            )}

            <button 
              onClick={onClose} 
              className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chuyển Tab: Chỉ số & Bệnh nền vs Tài liệu & Phẫu thuật */}
        <div className="bg-white px-4 pt-1 pb-3 border-b border-gray-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("vitals")}
            className={cn(
              "flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              activeTab === "vitals" 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Activity size={15} />
            <span>Chỉ số & Bệnh nền</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={cn(
              "flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
              activeTab === "documents" 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <ClipboardList size={15} />
            <span>Tài liệu & Bệnh án (AI)</span>
            {medicalDocs.length > 0 && (
              <span className={cn(
                "text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1",
                activeTab === "documents" ? "bg-white text-primary" : "bg-primary text-white"
              )}>
                {medicalDocs.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ================= TAB 1: CHỈ SỐ & BỆNH NỀN ================= */}
          {activeTab === "vitals" && (
            <>
              {/* Patient Card */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-black text-xl border-2 border-white shadow-sm shrink-0">
                  {meta.avatar_url ? (
                    <img src={meta.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    fullName[0]?.toUpperCase() || "B"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#1a2b4b] font-black text-lg truncate">Bác {fullName.replace(/^bác\s+/i, '')}</h3>
                  <p className="text-gray-500 text-xs font-medium">Bệnh nhân cao tuổi • ID: {patientId.substring(0, 8)}</p>
                </div>
              </div>

              {/* Body Metrics & BMI */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="font-extrabold text-sm text-[#1A2B4B] flex items-center gap-1.5">
                    <Heart size={16} className="text-rose-500" /> Chỉ số thể chất & BMI
                  </h4>
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-lg border", bmiColor)}>
                    {bmiCategory}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {/* Height */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase">Chiều cao</label>
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          className="w-16 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#1A2B4B] outline-none"
                        />
                        <span className="text-xs font-bold text-gray-500">cm</span>
                      </div>
                    ) : (
                      <p className="text-lg font-black text-[#1A2B4B] mt-1">{height} cm</p>
                    )}
                  </div>

                  {/* Weight */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase">Cân nặng</label>
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-16 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#1A2B4B] outline-none"
                        />
                        <span className="text-xs font-bold text-gray-500">kg</span>
                      </div>
                    ) : (
                      <p className="text-lg font-black text-[#1A2B4B] mt-1">{weight} kg</p>
                    )}
                  </div>

                  {/* Auto BMI */}
                  <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-100">
                    <label className="text-[10px] font-bold text-primary block uppercase">BMI tự tính</label>
                    <p className="text-xl font-black text-primary mt-1">{bmiVal}</p>
                  </div>

                  {/* Blood type */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase">Nhóm máu</label>
                    {isEditing ? (
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#1A2B4B] outline-none mt-1"
                      >
                        <option value="A">Nhóm A</option>
                        <option value="B">Nhóm B</option>
                        <option value="AB">Nhóm AB</option>
                        <option value="O">Nhóm O</option>
                      </select>
                    ) : (
                      <p className="text-lg font-black text-[#1A2B4B] mt-1">Nhóm {bloodType}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chronic Medical Conditions */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h4 className="font-extrabold text-sm text-danger flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Activity size={16} /> Tiền sử bệnh nền (Dùng để AI kiểm tra tương tác thuốc)
                </h4>

                <div className="flex flex-wrap gap-2 pt-1">
                  {diseases.map((d, idx) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 bg-red-50 text-danger border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>{d}</span>
                      {isEditing && (
                        <button onClick={() => handleRemoveDisease(idx)} className="hover:text-red-800 cursor-pointer">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="pt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập tên bệnh nền (VD: Tim mạch, Gout...)"
                      value={newDiseaseInput}
                      onChange={(e) => setNewDiseaseInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDisease()}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleAddDisease}
                      className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus size={14} /> Thêm
                    </button>
                  </div>
                )}
              </div>

              {/* Personal & Emergency Info */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h4 className="font-extrabold text-sm text-[#1A2B4B] flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <User size={16} className="text-gray-500" /> Thông tin cá nhân & Liên hệ SOS
                </h4>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <Calendar size={15} /> Ngày sinh:
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none"
                      />
                    ) : (
                      <span className="font-bold text-[#1A2B4B]">{dob ? new Date(dob).toLocaleDateString("vi-VN") : "Chưa rõ"}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <User size={15} /> Giới tính:
                    </span>
                    {isEditing ? (
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    ) : (
                      <span className="font-bold text-[#1A2B4B]">{gender}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <MapPin size={15} /> Nơi ở:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none max-w-[200px]"
                      />
                    ) : (
                      <span className="font-bold text-[#1A2B4B] truncate max-w-[200px]">{address}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <Phone size={15} /> SĐT người thân SOS:
                    </span>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none max-w-[150px]"
                      />
                    ) : (
                      <span className="font-bold text-danger">{emergencyPhone}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-amber-500" /> Dị ứng:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none max-w-[200px]"
                      />
                    ) : (
                      <span className="font-bold text-gray-700">{allergies}</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= TAB 2: TÀI LIỆU Y TẾ & PHẪU THUẬT (AI) ================= */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              
              {/* Nút hành động chính: Chụp / Tải tài liệu y tế */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-300 animate-pulse" />
                    <h3 className="font-black text-base sm:text-lg">Kho Tài Liệu Khám & Phẫu Thuật</h3>
                  </div>
                  <p className="text-xs text-blue-100 mt-1 font-medium leading-relaxed">
                    Chụp giấy ra viện, biên bản mổ hoặc sổ khám bệnh để AI Gemini phân tích bóc tách súc tích.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScanDocError(null);
                    setShowDocUploadModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-primary font-black text-xs rounded-2xl shadow-md hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Chụp / Tải tài liệu mới</span>
                </button>
              </div>

              {/* Bộ lọc loại tài liệu */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "surgery_record", label: "Phẫu thuật" },
                  { id: "discharge_paper", label: "Giấy ra viện" },
                  { id: "prescription", label: "Đơn thuốc" },
                  { id: "lab_test", label: "Xét nghiệm" },
                  { id: "consultation", label: "Khám bệnh" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedFilter(tab.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px]",
                      selectedFilter === tab.id
                        ? "bg-[#1A2B4B] text-white shadow-sm"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Danh sách tài liệu y tế */}
              {filteredDocs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-gray-300 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-primary mx-auto flex items-center justify-center">
                    <FileText size={26} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1A2B4B]">Chưa có tài liệu y tế nào</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      Hãy bấm "Chụp / Tải tài liệu mới" để lưu giữ giấy tờ khám chữa bệnh, biên bản mổ hoặc đơn thuốc vào hồ sơ.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDemoSurgerySample}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    🧪 Thử nghiệm mẫu: Biên bản Phẫu thuật HeyMedi
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocs.map((doc) => {
                    const typeInfo = getDocumentTypeInfo(doc.type);
                    const isAlreadyInDiseases = doc.diagnosis && diseases.includes(doc.diagnosis);

                    return (
                      <div
                        key={doc.id}
                        className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3 hover:border-blue-200 transition-all"
                      >
                        {/* Top: Loại tài liệu + Ngày + Nút xóa */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-[10px] font-black px-2.5 py-0.5 rounded-full border", typeInfo.badgeColor)}>
                            {typeInfo.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                              <Calendar size={12} /> {doc.date}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Xóa tài liệu"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Tiêu đề & Tên viện */}
                        <div>
                          <h4 className="font-black text-sm text-[#1A2B4B] line-clamp-1">{doc.title}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <Building2 size={12} /> {doc.hospitalName}
                            </span>
                            {doc.doctorName && (
                              <span className="flex items-center gap-1 font-medium text-gray-600">
                                <Stethoscope size={12} /> {doc.doctorName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chẩn đoán & Phẫu thuật */}
                        {(doc.diagnosis || doc.procedureName) && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-xs space-y-1">
                            {doc.diagnosis && (
                              <div>
                                <span className="text-gray-400 font-bold text-[10px] uppercase block">Chẩn đoán y khoa:</span>
                                <b className="text-rose-600 font-black">{doc.diagnosis}</b>
                              </div>
                            )}
                            {doc.procedureName && (
                              <div className="pt-1 border-t border-slate-200/60">
                                <span className="text-gray-400 font-bold text-[10px] uppercase block">Phẫu thuật / Thủ thuật:</span>
                                <b className="text-[#1A2B4B] font-extrabold">{doc.procedureName}</b>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tóm tắt súc tích */}
                        {doc.summary && (
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                            {doc.summary}
                          </p>
                        )}

                        {/* Nút hành động */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => setSelectedDocForView(doc)}
                            className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>Chi tiết & Xem ảnh gốc</span>
                          </button>

                          {doc.diagnosis && !isAlreadyInDiseases && (
                            <button
                              type="button"
                              onClick={() => handleAddDiagnosisToDiseases(doc.diagnosis!)}
                              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={12} /> Thêm vào Bệnh nền
                            </button>
                          )}
                          {isAlreadyInDiseases && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <ShieldCheck size={12} /> Đã lưu bệnh nền
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

        {/* ================= MODAL CHỌN NGUỒN TÀI LIỆU ================= */}
        {showDocUploadModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  <h4 className="font-extrabold text-sm text-[#1A2B4B]">Chụp / Tải Tài Liệu Y Tế (AI)</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {scanDocError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={15} />
                    <span>Lỗi nhận diện tài liệu:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{scanDocError}</p>
                </div>
              )}

              {/* Input file ẩn */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={docFileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    processDocumentFile(f, URL.createObjectURL(f));
                  }
                }}
              />

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocUploadModal(false);
                    setIsLiveCameraOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-primary hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20 active:scale-98 transition-all"
                >
                  <Camera size={18} />
                  <span>📸 Mở máy ảnh chụp trực tiếp</span>
                </button>

                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#1A2B4B] rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                >
                  <UploadCloud size={18} />
                  <span>📁 Tải ảnh từ thư viện thiết bị</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseDemoSurgerySample}
                  className="w-full py-2.5 text-xs text-gray-500 hover:text-primary font-semibold text-center transition-colors cursor-pointer"
                >
                  Hoặc bấm vào đây để dùng thử mẫu Biên bản Phẫu thuật HeyMedi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Camera Live Capture */}
        {isLiveCameraOpen && (
          <ElderlyCameraCaptureModal
            isOpen={isLiveCameraOpen}
            onClose={() => setIsLiveCameraOpen(false)}
            title="Chụp Ảnh Tài Liệu Y Tế / Phẫu Thuật"
            subtitle="Căn chỉnh giấy ra viện, biên bản mổ hoặc sổ khám bệnh vào khung"
            guideText="ĐẶT VĂN BẢN Y TẾ VUÔNG VẮN VÀO KHUNG ĐỂ AI NHẬN DIỆN CHÍNH XÁC"
            confirmButtonText="TIẾP TỤC PHÂN TÍCH BÓC TÁCH Y KHOA"
            onCaptureComplete={(blob, previewUrl) => {
              setIsLiveCameraOpen(false);
              const file = new File([blob], `doc_${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
              processDocumentFile(file, previewUrl);
            }}
          />
        )}

        {/* ================= MÀN HÌNH HIỆU ỨNG QUÉT SCANNER HUD (Web Audio Synth) ================= */}
        {isScanningDoc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 flex flex-col items-center">
              
              {/* Khung HUD quét radar công nghệ cao */}
              <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-slate-950 border-2 border-cyan-400 shadow-xl flex items-center justify-center">
                {capturedDocPreview ? (
                  <img
                    src={capturedDocPreview}
                    alt="Tài liệu đang quét"
                    className="w-full h-full object-contain filter contrast-105 opacity-80"
                  />
                ) : (
                  <div className="text-white text-xs">Đang nạp ảnh tài liệu...</div>
                )}

                {/* 4 Góc Reticle định vị phát sáng */}
                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-md shadow-[0_0_8px_#22d3ee]" />
                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-md shadow-[0_0_8px_#22d3ee]" />
                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl-md shadow-[0_0_8px_#22d3ee]" />
                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br-md shadow-[0_0_8px_#22d3ee]" />

                {/* Tia Laser Quét Chạy Dọc */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-laser pointer-events-none" />

                {/* Badge HUD */}
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-xs text-cyan-300 border border-cyan-400/60 px-2 py-0.5 rounded-full text-[9px] font-mono flex items-center gap-1.5 shadow-md animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>AI VISION: ANALYZING_MEDICAL_RECORD</span>
                </div>
              </div>

              {/* Thanh tiến trình */}
              <div className="w-full space-y-1.5 text-center">
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${scanDocProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1">
                  <span className="flex items-center gap-1 text-[#1a2b4b]">
                    <Loader2 size={13} className="animate-spin text-primary" />
                    <span>{scanDocStage}</span>
                  </span>
                  <span className="text-primary font-mono">{scanDocProgress}%</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= MÀN HÌNH DUYỆT & LƯU TÀI LIỆU Y TẾ BÓC TÁCH ================= */}
        {isReviewingDoc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 space-y-4">
              
              {/* Header Review */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Check size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#1A2B4B]">Bác Sĩ AI Đã Bóc Tách Tài Liệu</h3>
                    <p className="text-[11px] text-gray-400">Kiểm tra thông tin trước khi lưu vào Hồ sơ y tế</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewingDoc(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form nội dung bóc tách */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                
                {/* Loại tài liệu & Tiêu đề */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-500 block mb-1">Loại tài liệu y tế</label>
                    <select
                      value={docFormData.docType}
                      onChange={(e) => setDocFormData({ ...docFormData, docType: e.target.value as any })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-[#1A2B4B] outline-none"
                    >
                      <option value="surgery_record">🔴 Biên bản Phẫu thuật / Thủ thuật</option>
                      <option value="discharge_paper">🟢 Giấy Ra Viện</option>
                      <option value="consultation">🟣 Phiếu Khám Bệnh / Sổ Y Bạ</option>
                      <option value="lab_test">🟡 Kết Quả Xét Nghiệm / Chẩn Đoán</option>
                      <option value="prescription">🔵 Đơn Thuốc Bác Sĩ</option>
                      <option value="other">⚪ Tài Liệu Y Khoa Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-500 block mb-1">Ngày thực hiện / Ngày khám</label>
                    <input
                      type="text"
                      value={docFormData.date}
                      onChange={(e) => setDocFormData({ ...docFormData, date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-[#1A2B4B] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-500 block mb-1">Tiêu đề tài liệu</label>
                  <input
                    type="text"
                    value={docFormData.title}
                    onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
                    placeholder="VD: Phẫu thuật nội soi cắt túi mật..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-black text-[#1A2B4B] outline-none"
                  />
                </div>

                {/* Bệnh viện & Bác sĩ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-500 block mb-1">Bệnh viện / Cơ sở y tế</label>
                    <input
                      type="text"
                      value={docFormData.hospitalName}
                      onChange={(e) => setDocFormData({ ...docFormData, hospitalName: e.target.value })}
                      placeholder="Tên bệnh viện..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-[#1A2B4B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-500 block mb-1">Bác sĩ / Phẫu thuật viên</label>
                    <input
                      type="text"
                      value={docFormData.doctorName}
                      onChange={(e) => setDocFormData({ ...docFormData, doctorName: e.target.value })}
                      placeholder="Tên bác sĩ..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-[#1A2B4B] outline-none"
                    />
                  </div>
                </div>

                {/* Chẩn đoán y khoa */}
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 space-y-1.5">
                  <label className="font-bold text-rose-700 block">Chẩn đoán y khoa chính thức (ICD-10)</label>
                  <input
                    type="text"
                    value={docFormData.diagnosis}
                    onChange={(e) => setDocFormData({ ...docFormData, diagnosis: e.target.value })}
                    placeholder="VD: Sỏi túi mật có viêm mạn (K80.1)..."
                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 font-black text-rose-900 outline-none"
                  />

                  {docFormData.diagnosis && (
                    <label className="flex items-center gap-2 pt-1 font-bold text-[11px] text-rose-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAddChronicDisease}
                        onChange={(e) => setAutoAddChronicDisease(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 cursor-pointer"
                      />
                      <span>Đồng thời thêm chẩn đoán này vào Tiền sử bệnh nền</span>
                    </label>
                  )}
                </div>

                {/* Phương pháp phẫu thuật (nếu có) */}
                {(docFormData.docType === "surgery_record" || docFormData.procedureName) && (
                  <div>
                    <label className="font-bold text-gray-500 block mb-1">Phương pháp phẫu thuật / Can thiệp</label>
                    <input
                      type="text"
                      value={docFormData.procedureName}
                      onChange={(e) => setDocFormData({ ...docFormData, procedureName: e.target.value })}
                      placeholder="VD: Phẫu thuật nội soi cắt túi mật trọn gói..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-[#1A2B4B] outline-none"
                    />
                  </div>
                )}

                {/* Tóm tắt súc tích */}
                <div>
                  <label className="font-bold text-gray-500 block mb-1">Tóm tắt y khoa bóc tách</label>
                  <textarea
                    rows={3}
                    value={docFormData.summary}
                    onChange={(e) => setDocFormData({ ...docFormData, summary: e.target.value })}
                    placeholder="Tóm tắt ngắn gọn tình trạng..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 outline-none"
                  />
                </div>

                {/* Lời dặn / Hướng điều trị */}
                <div>
                  <label className="font-bold text-gray-500 block mb-1">Lời dặn bác sĩ / Kế hoạch điều trị</label>
                  <textarea
                    rows={2}
                    value={docFormData.treatmentPlan}
                    onChange={(e) => setDocFormData({ ...docFormData, treatmentPlan: e.target.value })}
                    placeholder="Kiêng khem, chăm sóc vết thương, hẹn tái khám..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 outline-none"
                  />
                </div>

              </div>

              {/* Nút lưu */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReviewingDoc(false)}
                  disabled={isSavingDoc}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveMedicalDoc}
                  disabled={isSavingDoc}
                  className="flex-2 py-3 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/25 cursor-pointer"
                >
                  {isSavingDoc ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Lưu Vào Hồ Sơ Y Tế</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ================= MODAL XEM CHI TIẾT & ẢNH GỐC TÀI LIỆU ================= */}
        {selectedDocForView && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 space-y-4">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-black px-2.5 py-0.5 rounded-full border", getDocumentTypeInfo(selectedDocForView.type).badgeColor)}>
                    {getDocumentTypeInfo(selectedDocForView.type).label}
                  </span>
                  <h3 className="font-extrabold text-sm text-[#1A2B4B] truncate max-w-[200px] sm:max-w-xs">{selectedDocForView.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocForView(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                
                {/* Ảnh tài liệu gốc nếu có */}
                {selectedDocForView.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-gray-200 max-h-56 flex items-center justify-center group">
                    <img
                      src={selectedDocForView.imageUrl}
                      alt="Ảnh gốc tài liệu"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setIsZoomImageOpen(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setIsZoomImageOpen(true)}
                      className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <ZoomIn size={12} /> Phóng to ảnh
                    </button>
                  </div>
                )}

                {/* Thông tin y khoa */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold">Cơ sở y tế:</span>
                    <b className="text-primary">{selectedDocForView.hospitalName}</b>
                  </div>
                  {selectedDocForView.doctorName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">Bác sĩ phụ trách:</span>
                      <b className="text-gray-800">{selectedDocForView.doctorName}</b>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold">Ngày ghi nhận:</span>
                    <b className="text-gray-800">{selectedDocForView.date}</b>
                  </div>
                  {selectedDocForView.diagnosis && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-gray-400 font-bold block mb-0.5">Chẩn đoán y khoa:</span>
                      <b className="text-rose-600 font-black text-sm">{selectedDocForView.diagnosis}</b>
                    </div>
                  )}
                  {selectedDocForView.procedureName && (
                    <div className="pt-1">
                      <span className="text-gray-400 font-bold block mb-0.5">Phẫu thuật / Thủ thuật:</span>
                      <b className="text-[#1A2B4B] font-extrabold">{selectedDocForView.procedureName}</b>
                    </div>
                  )}
                </div>

                {/* Tóm tắt y khoa */}
                <div className="space-y-1">
                  <span className="font-bold text-gray-500 block">Tóm tắt diễn biến & can thiệp:</span>
                  <div className="bg-white border border-gray-200 rounded-2xl p-3 text-gray-700 leading-relaxed font-medium">
                    {selectedDocForView.summary}
                  </div>
                </div>

                {/* Hướng điều trị */}
                {selectedDocForView.treatmentPlan && (
                  <div className="space-y-1">
                    <span className="font-bold text-gray-500 block">Kế hoạch điều trị & Lời dặn:</span>
                    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-3 text-blue-950 leading-relaxed font-medium">
                      {selectedDocForView.treatmentPlan}
                    </div>
                  </div>
                )}

                {/* Cảnh báo y khoa nếu có */}
                {selectedDocForView.cautions && selectedDocForView.cautions.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3 space-y-1.5 text-red-950">
                    <div className="font-black flex items-center gap-1.5 text-red-700">
                      <AlertTriangle size={14} />
                      <span>Dấu hiệu cần tái khám cấp cứu ngay:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] font-semibold space-y-0.5 text-red-800 pl-1">
                      {selectedDocForView.cautions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {/* Đóng */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteDoc(selectedDocForView.id)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Xóa tài liệu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocForView(null)}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Zoom ảnh tài liệu toàn màn hình */}
        {isZoomImageOpen && selectedDocForView?.imageUrl && (
          <div 
            className="fixed inset-0 z-70 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in"
            onClick={() => setIsZoomImageOpen(false)}
          >
            <div className="relative max-w-4xl max-h-[92vh] flex items-center justify-center">
              <img
                src={selectedDocForView.imageUrl}
                alt="Tài liệu phóng to"
                className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setIsZoomImageOpen(false)}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Tóm tắt Y khoa & Cấp cứu cho Bác sĩ (Xuất PDF / In / Sao chép Zalo) */}
        {showExportModal && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200 animate-scale-up my-auto">
              
              {/* Header thanh công cụ (Ẩn khi in) */}
              <div className="p-4 sm:p-5 bg-[#1A2B4B] text-white flex items-center justify-between gap-3 shrink-0 no-print">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-rose-400 font-black">
                    <Activity size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>Tóm Tắt Y Khoa & Cấp Cứu</span>
                      <span className="text-[10px] uppercase font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full">Bác sĩ / Cấp cứu</span>
                    </h3>
                    <p className="text-xs text-blue-200">Trích xuất hồ sơ tóm tắt phục vụ khám chữa bệnh hoặc theo dõi khẩn cấp</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyDoctorSummary}
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Sao chép tóm tắt gửi nhanh qua Zalo / Tin nhắn cho Bác sĩ"
                  >
                    {isCopied ? <CheckCheck size={15} className="text-emerald-300" /> : <Copy size={15} />}
                    <span className="hidden sm:inline">{isCopied ? "Đã chép!" : "Chép Zalo"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintMedicalReport}
                    className="flex items-center gap-1.5 bg-primary hover:bg-blue-600 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
                    title="In bản A4 hoặc Lưu dạng PDF"
                  >
                    <Printer size={15} />
                    <span className="hidden sm:inline">In / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all cursor-pointer ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tờ tóm tắt Y khoa A4 Printable */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-white text-[#1A2B4B]" id="heymedi-medical-export-sheet">
                
                {/* CSS Print Rules */}
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #heymedi-medical-export-sheet, #heymedi-medical-export-sheet * { visibility: visible !important; }
                    #heymedi-medical-export-sheet {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      height: auto !important;
                      padding: 20px 30px !important;
                      background: white !important;
                      z-index: 999999 !important;
                    }
                    .no-print { display: none !important; }
                  }
                `}</style>

                {/* Tiêu đề Hồ sơ HeyMedi */}
                <div className="flex items-start justify-between border-b-2 border-primary/20 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-primary">HeyMedi</span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">Y tế Thông minh</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1A2B4B] uppercase mt-1 tracking-wide">
                      Bản Tóm Tắt Thông Tin Y Tế & Cấp Cứu
                    </h2>
                    <p className="text-xs text-gray-500 italic mt-0.5">Dành cho Bác sĩ điều trị, Bệnh viện & Nhân viên Cấp cứu Y tế</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-700">Ngày xuất: <span className="font-semibold text-gray-900">{new Date().toLocaleDateString('vi-VN')}</span></p>
                    <p className="text-xs font-bold text-gray-500">Mã BN: <span className="font-mono font-bold text-primary">BN-{patientId.substring(0, 8).toUpperCase()}</span></p>
                  </div>
                </div>

                {/* Phần 1: Thông tin người bệnh & Liên hệ khẩn */}
                <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-1.5">
                    <User size={14} className="text-primary" /> Thông tin bệnh nhân & Người liên hệ
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
                    <div>
                      <span className="text-gray-500 block">Họ và tên:</span>
                      <span className="font-bold text-sm text-[#1A2B4B]">Bác {fullName.replace(/^bác\s+/i, '')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Ngày sinh / Tuổi:</span>
                      <span className="font-bold text-[#1A2B4B]">
                        {dob ? `${dob} (${Math.floor((new Date().getTime() - new Date(dob).getTime()) / (365.25 * 24 * 3600000))} tuổi)` : "--"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Giới tính:</span>
                      <span className="font-bold text-[#1A2B4B]">{gender || "Chưa rõ"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Nhóm máu:</span>
                      <span className="font-black text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md inline-block">
                        {bloodType || "Chưa rõ"}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block">Liên hệ khẩn cấp (Người nhà):</span>
                      <span className="font-bold text-rose-600 flex items-center gap-1">
                        <Phone size={12} />
                        {emergencyPhone || "Chưa cập nhật"} {meta.emergency_contact_name ? `(${meta.emergency_contact_name})` : ""}
                      </span>
                    </div>
                    {address && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-gray-500 block">Địa chỉ thường trú:</span>
                        <span className="font-medium text-gray-800">{address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phần 2: CẢNH BÁO DỊ ỨNG THUỐC (ĐẶC BIỆT QUAN TRỌNG) */}
                <div className="bg-red-50/90 border-2 border-red-300 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-black">
                      <AlertTriangle size={15} />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-700">
                      Cảnh báo dị ứng thuốc (Bác sĩ & Dược sĩ đặc biệt lưu ý):
                    </h4>
                  </div>
                  <div className="text-sm font-black text-red-900 bg-white/80 p-3 rounded-xl border border-red-200">
                    {allergies ? allergies : "Chưa ghi nhận tiền sử dị ứng thuốc nguy hiểm."}
                  </div>
                </div>

                {/* Phần 3: Tiền sử Bệnh nền mãn tính & Thể trạng */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1A2B4B] flex items-center gap-1.5">
                      <Heart size={14} className="text-rose-500" /> Bệnh lý nền & Chỉ số thể chất
                    </h4>
                    <span className="text-xs font-bold text-gray-500">
                      Cao: {height || "--"}cm • Nặng: {weight || "--"}kg • BMI: <strong className="text-primary">{bmiVal}</strong> ({bmiCategory})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {diseases.length > 0 ? (
                      diseases.map((d, i) => (
                        <span key={i} className="text-xs font-bold px-3 py-1 bg-white text-blue-900 border border-blue-200 rounded-lg shadow-2xs">
                          🩺 {d}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">Chưa ghi nhận bệnh nền mạn tính.</span>
                    )}
                  </div>
                </div>

                {/* Phần 4: Danh sách thuốc đang điều trị hàng ngày */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1A2B4B] flex items-center gap-1.5">
                      <Pill size={15} className="text-primary" /> Thuốc đang điều trị tại nhà (Đơn hiện hành)
                    </h4>
                    <span className="text-xs font-bold text-gray-500">Tổng cộng: {activeMedicationsList.length} loại thuốc</span>
                  </div>

                  {activeMedicationsList.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                            <th className="p-2.5 w-10 text-center">STT</th>
                            <th className="p-2.5">Tên thuốc</th>
                            <th className="p-2.5">Liều dùng</th>
                            <th className="p-2.5">Cữ uống trong ngày</th>
                            <th className="p-2.5">Hướng dẫn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {activeMedicationsList.map((m, idx) => (
                            <tr key={m.id || idx} className="hover:bg-gray-50/60">
                              <td className="p-2.5 font-bold text-center text-gray-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-[#1A2B4B]">{m.name}</td>
                              <td className="p-2.5 font-semibold text-gray-700">{m.dosage || "1 viên"}</td>
                              <td className="p-2.5">
                                <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                  {m.instructions?.split('|')[1]?.trim() || (m.nextScheduledTime ? m.nextScheduledTime.substring(11, 16) : "Hàng ngày")}
                                </span>
                              </td>
                              <td className="p-2.5 text-gray-600 italic">{m.instructions?.split('|')[0] || "Theo chỉ định"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 italic border border-gray-100">
                      Hiện tại chưa có thuốc nào đang cài đặt trong lộ trình nhắc nhở.
                    </div>
                  )}
                </div>

                {/* Phần 5: Lịch sử Khám bệnh & Phẫu thuật gần nhất (AI Trích xuất) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1A2B4B] flex items-center gap-1.5">
                    <FileText size={15} className="text-primary" /> Hồ sơ Khám bệnh & Biên bản phẫu thuật gần đây
                  </h4>

                  {medicalDocs.length > 0 ? (
                    <div className="space-y-2">
                      {medicalDocs.slice(0, 4).map((d) => (
                        <div key={d.id} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary text-sm flex items-center gap-1.5">
                              {d.type === 'surgery_record' ? '🔪 ' : '📋 '} {d.title}
                            </span>
                            <span className="text-gray-500 font-semibold">{d.date} • {d.hospitalName || "Cơ sở y tế"}</span>
                          </div>
                          {d.diagnosis && (
                            <p className="text-gray-800"><strong className="text-gray-700">Chẩn đoán:</strong> {d.diagnosis}</p>
                          )}
                          {d.procedureName && (
                            <p className="text-indigo-900"><strong className="text-gray-700">Phương pháp can thiệp:</strong> {d.procedureName}</p>
                          )}
                          {d.summary && (
                            <p className="text-gray-600 line-clamp-2"><strong className="text-gray-700">Tóm tắt:</strong> {d.summary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 italic border border-gray-100">
                      Chưa có tài liệu hồ sơ khám bệnh/phẫu thuật nào được lưu trữ.
                    </div>
                  )}
                </div>

                {/* Chân trang xác thực */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <QrCode size={28} className="text-gray-400" />
                    <div>
                      <p className="font-bold text-gray-600">Ứng dụng Quản lý Thuốc & Sức khỏe Cao tuổi HeyMedi</p>
                      <p>Dữ liệu y khoa được lưu trữ bảo mật & mã hóa theo tiêu chuẩn chăm sóc gia đình.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-600">Xác nhận của Người giám hộ / Bệnh nhân</p>
                    <p className="italic">(Ký & ghi rõ họ tên)</p>
                  </div>
                </div>

              </div>

              {/* Chân Modal tương tác (Ẩn khi in) */}
              <div className="p-3.5 sm:p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0 no-print">
                <p className="text-xs text-gray-500">
                  💡 Nhấn <strong>"In / PDF"</strong> để in A4 ra giấy mang đến bệnh viện hoặc gửi file PDF cho bác sĩ.
                </p>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
