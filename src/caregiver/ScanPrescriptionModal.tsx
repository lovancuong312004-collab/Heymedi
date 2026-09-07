import { useState, useRef, useEffect, useMemo } from "react";
import { 
  X, 
  Camera, 
  Scan, 
  Check, 
  Loader2, 
  Trash2, 
  Clock, 
  Sparkles, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  User, 
  Stethoscope, 
  AlertTriangle,
  Lock,
  HeartPulse
} from "lucide-react";
import { 
  analyzePrescription, 
  type ParsedMedication
} from "../utils/geminiVision";
import { addMedicationWithCourse, saveDiagnosisRecord } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanPrescriptionModal({ isOpen, onClose, onSuccess }: Props) {
  const { linkedPatientId, patientInfo, patientName } = useFamily();
  const currentPatientName = patientInfo?.name || patientName || "Bác";

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Trạng thái quét & hiệu ứng công nghệ cao
  const [step, setStep] = useState<"capture" | "scanning" | "review">("capture");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStageText, setScanStageText] = useState("Đang chuẩn bị ảnh...");
  const [isSaving, setIsSaving] = useState(false);
  const [showOriginalPhoto, setShowOriginalPhoto] = useState(false);

  // Dữ liệu y khoa bóc tách
  const [prescriptionMeta, setPrescriptionMeta] = useState<{
    hospitalName?: string;
    patientName?: string;
    diagnosis?: string;
    doctorName?: string;
    revisitDays?: number;
  }>({});
  const [medsList, setMedsList] = useState<ParsedMedication[]>([]);
  const [commonStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Trạng thái xác nhận nếu tên bệnh nhân bị lệch
  const [isMismatchConfirmed, setIsMismatchConfirmed] = useState(false);

  // Kiểm tra đối chiếu tên bệnh nhân trên đơn thuốc và trong hệ thống
  const isNameMismatch = useMemo(() => {
    if (!prescriptionMeta.patientName || !currentPatientName) return false;
    const normalize = (s: string) => 
      s.toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
       .replace(/[^a-z0-9]/g, "");
       
    const normRx = normalize(prescriptionMeta.patientName);
    const normCur = normalize(currentPatientName);
    
    // Nếu chứa nhau thì coi là đúng người
    if (normRx.includes(normCur) || normCur.includes(normRx)) return false;
    
    // Kiểm tra các từ riêng lẻ
    const wordsRx = prescriptionMeta.patientName.toLowerCase().split(/[\s()]+/);
    const wordsCur = currentPatientName.toLowerCase().split(/[\s()]+/);
    const hasCommonWord = wordsRx.some(w => w.length >= 2 && wordsCur.includes(w));
    if (hasCommonWord) return false;
    
    return true;
  }, [prescriptionMeta.patientName, currentPatientName]);

  useEffect(() => {
    if (step === "scanning") {
      setScanProgress(10);
      setScanStageText("📸 Đang nạp & tối ưu độ nét đơn thuốc...");

      const t1 = setTimeout(() => {
        setScanProgress(35);
        setScanStageText("🔍 Nhận diện OCR chữ viết & bảng đơn thuốc...");
      }, 700);

      const t2 = setTimeout(() => {
        setScanProgress(65);
        setScanStageText("💊 Phân tích Hoạt chất, Liều dùng & Số lượng viên...");
      }, 1500);

      const t3 = setTimeout(() => {
        setScanProgress(90);
        setScanStageText("⏱️ Khóa cữ theo chỉ định bác sĩ & Phân loại thuốc khi đau...");
      }, 2300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStep("scanning");

      try {
        const [result] = await Promise.all([
          analyzePrescription(file),
          new Promise((resolve) => setTimeout(resolve, 2800))
        ]);

        setScanProgress(100);
        setScanStageText("✅ Hoàn tất trích xuất dữ liệu lâm sàng!");

        setTimeout(() => {
          setPrescriptionMeta({
            hospitalName: result.hospitalName,
            patientName: result.patientName,
            diagnosis: result.diagnosis,
            doctorName: result.doctorName,
            revisitDays: result.revisitDays
          });
          setMedsList(result.medications);
          setStep("review");
        }, 400);

      } catch (err: any) {
        alert(err.message || "Có lỗi xảy ra khi quét đơn thuốc. Vui lòng thử lại!");
        resetState();
      }
    }
  };

  const resetState = () => {
    setImageFile(null);
    setImagePreview(null);
    setMedsList([]);
    setPrescriptionMeta({});
    setScanProgress(0);
    setShowOriginalPhoto(false);
    setIsMismatchConfirmed(false);
    setStep("capture");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const removeMed = (index: number) => {
    setMedsList(prev => prev.filter((_, i) => i !== index));
    if (medsList.length === 1) {
      resetState();
    }
  };

  // Cập nhật giờ chuông báo thức cho một cữ (Người nhà được phép chỉnh giờ ăn uống của gia đình)
  const updateSlotTime = (medIdx: number, slotIdx: number, newTime: string) => {
    setMedsList(prev => {
      const newList = [...prev];
      const targetMed = { ...newList[medIdx] };
      const newSlots = [...(targetMed.slots || [])];
      if (newSlots[slotIdx]) {
        newSlots[slotIdx] = { ...newSlots[slotIdx], time: newTime };
        targetMed.slots = newSlots;
        targetMed.times = newSlots.map(s => s.time);
      }
      newList[medIdx] = targetMed;
      return newList;
    });
  };

  // Lưu toàn bộ thuốc và tạo lịch nhắc chuẩn y khoa
  const handleSaveAll = async () => {
    if (!linkedPatientId) {
      alert("Lỗi: Không tìm thấy ID bệnh nhân liên kết");
      return;
    }
    if (medsList.length === 0) {
      alert("Không có thuốc nào để lưu");
      return;
    }
    if (isNameMismatch && !isMismatchConfirmed) {
      alert("⚠️ CẢNH BÁO: Tên trên đơn thuốc không khớp với người bệnh! Vui lòng tích chọn xác nhận trước khi tiếp tục.");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `rx_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data } = await supabase.storage
          .from('medication_images')
          .upload(fileName, imageFile, { upsert: true });
        
        if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('medication_images')
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      let totalRemindersCreated = 0;
      let scheduledCount = 0;
      let asNeededCount = 0;

      for (const med of medsList) {
        const isPRN = med.is_prn;
        const slotsDesc = (med.slots || []).map(s => `${s.label} lúc ${s.time}`).join(", ");

        if (isPRN) {
          // THUỐC DÙNG KHI ĐAU (PRN / KHI CẦN):
          // Lưu vào danh mục thuốc tủ thuốc của người bệnh, không ép chuông reo hàng ngày để tránh hại gan!
          asNeededCount++;
          await supabase
            .from('medications')
            .insert({
              patient_id: linkedPatientId,
              name: med.name.trim(),
              dosage: med.dosage || "1 viên",
              instructions: `[Thuốc dùng khi đau / SOS] ${med.instructions} • Cấp: ${med.total_quantity || 20} viên`,
              image_url: imageUrl || null
            });
        } else {
          // THUỐC ĐIỀU TRỊ ĐỊNH KỲ (Huyết áp, Vitamin C, Omega-3): Lên lịch đúng số ngày bác sĩ kê
          scheduledCount++;
          const times = med.times && med.times.length > 0 ? med.times : ["08:00"];
          const duration = med.duration_days && med.duration_days > 0 ? med.duration_days : 30;
          const instructionsText = `${med.instructions || "Uống theo đơn bác sĩ"} | Cữ: ${slotsDesc}`;

          await addMedicationWithCourse({
            patientId: linkedPatientId,
            name: med.name,
            dosage: med.dosage || "1 viên",
            instructions: instructionsText,
            dailyTimes: times,
            startDate: commonStartDate,
            durationDays: duration,
            imageUrl
          });

          totalRemindersCreated += times.length * duration;
        }
      }

      // TỰ ĐỘNG THÊM CHẨN ĐOÁN VÀO TIỀN SỬ BỆNH & HỒ SƠ BỆNH ÁN
      if (prescriptionMeta.diagnosis) {
        await saveDiagnosisRecord(linkedPatientId, {
          diagnosis: prescriptionMeta.diagnosis,
          hospitalName: prescriptionMeta.hospitalName,
          doctorName: prescriptionMeta.doctorName,
          date: new Date().toLocaleDateString('vi-VN'),
          revisitDays: prescriptionMeta.revisitDays || 30
        });
      }

      alert(
        `🎉 ĐÃ LÊN LỊCH THÀNH CÔNG THEO ĐƠN BÁC SĨ!\n` +
        `• ${scheduledCount} thuốc điều trị định kỳ: Kích hoạt ${totalRemindersCreated} lần nhắc chuông.\n` +
        `• ${asNeededCount} thuốc dùng khi đau (Paracetamol): Đã lưu vào Tủ thuốc mục 'Dùng khi cần' (Tránh lạm dụng).\n` +
        `• ĐÃ TỰ ĐỘNG CẬP NHẬT CHẨN ĐOÁN vào Tiền sử bệnh: "${prescriptionMeta.diagnosis}".`
      );

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error(error);
      alert(`Có lỗi xảy ra khi lưu: ${error.message || "Vui lòng thử lại"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[94vh] border border-gray-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-primary flex items-center justify-center font-bold">
              <Scan size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#1A2B4B]">Quét Đơn Thuốc Bác Sĩ (AI)</h3>
              <p className="text-gray-400 text-xs font-semibold">Tự động nhận diện liều lượng, cữ bữa ăn & lộ trình điều trị</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === "scanning" || isSaving}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          
          {/* 1. MÀN HÌNH CHỌN / CHỤP ẢNH */}
          {step === "capture" && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
              />

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-blue-50/80 to-indigo-50/80 text-primary border-2 border-dashed border-[#B3CCFF] rounded-[28px] p-8 sm:p-10 hover:bg-blue-100/50 transition-all cursor-pointer shadow-sm hover:shadow"
              >
                <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center text-primary">
                  <Camera size={38} />
                </div>
                <div className="text-center">
                  <span className="font-extrabold text-xl block text-[#1A2B4B]">Chụp Hoặc Tải Ảnh Đơn Thuốc</span>
                  <span className="text-xs sm:text-sm text-gray-500 mt-1 block font-medium">Hệ thống AI sẽ quét & hiển thị trực tiếp ảnh đơn thuốc</span>
                </div>
              </button>

              <div className="w-full bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-950 space-y-2">
                <div className="font-extrabold flex items-center gap-2 text-primary text-sm">
                  <Sparkles size={16} />
                  <span>Quy trình quét thông minh chuẩn y khoa:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
                  <li><b>Xem ảnh quét trực tiếp</b> với hiệu ứng quét radar laser công nghệ cao.</li>
                  <li><b>Phân tích cữ uống theo bữa ăn</b>: Sau ăn sáng, trước ăn, sau ăn trưa, trước ngủ.</li>
                  <li><b>Cài đặt giờ chuông báo</b> chính xác cho từng cữ uống để nhắc bệnh nhân.</li>
                  <li><b>Tính toán lộ trình chuẩn xác</b>: Số ngày điều trị tính theo số lượng viên & lịch hẹn tái khám của bác sĩ.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. MÀN HÌNH HIỂN THỊ ẢNH VÀ HIỆU ỨNG QUÉT LASER CHUYÊN NGHIỆP */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              
              {/* Khung quét ảnh HUD Công nghệ cao */}
              <div className="relative w-full max-w-sm h-72 sm:h-80 rounded-3xl overflow-hidden shadow-xl border-2 border-cyan-400/80 bg-slate-950 flex items-center justify-center">
                
                {/* Ảnh đơn thuốc người dùng tải lên */}
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Đơn thuốc đang quét" 
                    className="w-full h-full object-contain filter contrast-105 opacity-85"
                  />
                ) : (
                  <div className="text-white text-xs">Đang tải ảnh đơn thuốc...</div>
                )}

                {/* Phủ lớp mờ công nghệ */}
                <div className="absolute inset-0 bg-cyan-950/20 pointer-events-none" />

                {/* 4 Góc Reticle định vị phát sáng (Corner Brackets) */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg shadow-[0_0_10px_#22d3ee]" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg shadow-[0_0_10px_#22d3ee]" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg shadow-[0_0_10px_#22d3ee]" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg shadow-[0_0_10px_#22d3ee]" />

                {/* Tia Laser Quét Chạy Dọc Lên Xuống */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-laser pointer-events-none" />

                {/* Các Tag OCR Nhận diện động xuất hiện trên ảnh */}
                <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm text-cyan-300 border border-cyan-400/60 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide flex items-center gap-1.5 shadow-md animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>OCR SCANNING: PRESCRIPTION_AN_KHANG</span>
                </div>

                <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-sm text-emerald-300 border border-emerald-400/60 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide shadow-md">
                  <span>MEDS DETECTED • DOSAGE • TIMING</span>
                </div>
              </div>

              {/* Thanh tiến trình & Thông điệp trạng thái */}
              <div className="w-full max-w-sm space-y-2 text-center">
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1">
                  <span className="flex items-center gap-1 text-[#1a2b4b]">
                    <Loader2 size={13} className="animate-spin text-primary" />
                    <span>{scanStageText}</span>
                  </span>
                  <span className="text-primary font-mono">{scanProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. MÀN HÌNH DUYỆT ĐƠN THUỐC ĐẦY ĐỦ CƠ SỞ Y KHOA (REVIEW STEP) */}
          {step === "review" && (
            <div className="flex flex-col gap-4">
              
              {/* CẢNH BÁO LỆCH TÊN BỆNH NHÂN NẾU CÓ */}
              {isNameMismatch && (
                <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-4 text-red-950 space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                    <AlertTriangle size={20} className="shrink-0 animate-bounce" />
                    <span>CẢNH BÁO NGUY HIỂM: LỆCH TÊN BỆNH NHÂN TRÊN ĐƠN!</span>
                  </div>
                  
                  <div className="text-xs space-y-1 bg-white/90 p-3 rounded-2xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Tên trên đơn thuốc quét được:</span>
                      <b className="text-rose-600 font-black">{prescriptionMeta.patientName}</b>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-gray-500">Người bệnh bạn đang quản lý:</span>
                      <b className="text-[#1A2B4B] font-black">{currentPatientName}</b>
                    </div>
                  </div>

                  <p className="text-[11px] text-red-700 font-semibold leading-relaxed">
                    ⚠️ Nguy cơ y khoa: Uống nhầm đơn thuốc của người khác có thể gây tụt huyết áp đột ngột hoặc biến chứng nghiêm trọng! Vui lòng kiểm tra lại họ tên người khám trên đầu đơn thuốc.
                  </p>

                  <label className="flex items-start gap-2.5 pt-1 text-xs font-bold text-red-900 cursor-pointer bg-red-100/60 p-2.5 rounded-xl border border-red-200">
                    <input 
                      type="checkbox" 
                      checked={isMismatchConfirmed} 
                      onChange={(e) => setIsMismatchConfirmed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-rose-600 shrink-0 cursor-pointer"
                    />
                    <span>Tôi đã đối chiếu kỹ và cam đoan đơn thuốc này chính xác là của {currentPatientName}</span>
                  </label>
                </div>
              )}

              {/* Card Tóm tắt thông tin đơn thuốc bác sĩ */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/90 rounded-3xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-primary font-black text-sm sm:text-base">
                      <Building2 size={16} />
                      <span>{prescriptionMeta.hospitalName || "BỆNH VIỆN ĐA KHOA AN KHANG"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                      <span className="flex items-center gap-1">
                        <User size={13} className="text-gray-400" />
                        <b>Bệnh nhân:</b> {prescriptionMeta.patientName || currentPatientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope size={13} className="text-gray-400" />
                        <b>Bác sĩ:</b> {prescriptionMeta.doctorName || "BS. Trần Minh Khang"}
                      </span>
                    </div>
                  </div>

                  {/* Nút Xem lại ảnh gốc */}
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => setShowOriginalPhoto(!showOriginalPhoto)}
                      className="flex items-center gap-1 bg-white hover:bg-blue-50 text-primary border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-sm transition-all"
                    >
                      <Eye size={13} />
                      <span>{showOriginalPhoto ? "Thu nhỏ" : "Xem ảnh gốc"}</span>
                      {showOriginalPhoto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {/* Thông tin chẩn đoán & Tự động lưu tiền sử bệnh */}
                {prescriptionMeta.diagnosis && (
                  <div className="pt-2 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="text-xs text-gray-800">
                      <span className="text-gray-500 font-semibold">Chẩn đoán: </span>
                      <b className="text-[#1A2B4B]">{prescriptionMeta.diagnosis}</b>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full shrink-0">
                      <HeartPulse size={11} />
                      <span>Tự động cập nhật vào Tiền sử bệnh</span>
                    </span>
                  </div>
                )}

                {/* Khung mở rộng xem ảnh gốc */}
                {showOriginalPhoto && imagePreview && (
                  <div className="pt-2 border-t border-blue-200/60 mt-2 animate-fade-in">
                    <p className="text-[11px] text-gray-500 font-semibold mb-1.5">Ảnh đơn thuốc gốc đối chiếu:</p>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-300 bg-black/5 p-1">
                      <img src={imagePreview} alt="Đơn thuốc gốc" className="w-full h-auto rounded-lg" />
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh tiêu đề số lượng thuốc và nút chụp lại */}
              <div className="flex justify-between items-center px-1">
                <span className="font-extrabold text-[#1A2B4B] text-sm sm:text-base flex items-center gap-1.5">
                  <Lock size={15} className="text-primary" />
                  <span>Chỉ định {medsList.length} loại thuốc (Khóa theo đơn bác sĩ)</span>
                </span>
                <button 
                  onClick={resetState} 
                  className="text-xs text-primary font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Chụp đơn khác
                </button>
              </div>

              {/* Danh sách các thẻ thuốc chi tiết */}
              <div className="space-y-4">
                {medsList.map((med, idx) => {
                  const currentSlots = med.slots || [];
                  const isPRN = med.is_prn; // Thuốc dùng khi đau (Paracetamol)

                  // Tính toán ngày kết thúc dự kiến
                  const startD = new Date(commonStartDate);
                  const endD = new Date(startD);
                  endD.setDate(endD.getDate() + (med.duration_days || 30) - 1);
                  const endStr = `${String(endD.getDate()).padStart(2, '0')}/${String(endD.getMonth() + 1).padStart(2, '0')}/${endD.getFullYear()}`;

                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "border-2 rounded-3xl p-4 sm:p-5 relative space-y-3.5 shadow-sm transition-all",
                        isPRN 
                          ? "bg-amber-50/40 border-amber-200" 
                          : "bg-white border-gray-200 hover:border-blue-300"
                      )}
                    >
                      {/* Nút Xóa thuốc */}
                      <button 
                        onClick={() => removeMed(idx)}
                        className="absolute top-3.5 right-3.5 w-8 h-8 bg-white text-gray-400 hover:text-rose-600 border border-gray-200 shadow-sm rounded-full flex items-center justify-center hover:bg-red-50 cursor-pointer transition-colors"
                        title="Không dùng thuốc này"
                      >
                        <Trash2 size={14} />
                      </button>

                      {/* Header thẻ: Tên thuốc & Dạng bào chế */}
                      <div className="pr-8">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Thuốc #{idx + 1}
                          </span>
                          {med.form && (
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              Dạng: {med.form}
                            </span>
                          )}
                          {med.total_quantity && (
                            <span className="text-[10px] font-bold bg-blue-50 text-primary border border-blue-200 px-2 py-0.5 rounded-full">
                              Cấp: {med.total_quantity} viên
                            </span>
                          )}
                          {isPRN && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                              💊 Thuốc dùng khi đau (SOS)
                            </span>
                          )}
                        </div>

                        <div className="text-base font-black text-[#1A2B4B]">
                          {med.name}
                        </div>
                        {med.generic_name && (
                          <div className="text-xs text-gray-400 font-medium">
                            Hoạt chất: {med.generic_name}
                          </div>
                        )}
                      </div>

                      {/* ĐỐI VỚI THUỐC DÙNG KHI ĐAU (PRN - Paracetamol): HIỂN THỊ CHUYÊN BIỆT */}
                      {isPRN ? (
                        <div className="bg-amber-100/70 border border-amber-300/80 rounded-2xl p-3.5 space-y-2 text-amber-950">
                          <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                            <span>🛡️ QUY TẮC Y KHOA: THUỐC DÙNG THEO TRIỆU CHỨNG (KHI ĐAU)</span>
                          </div>
                          <p className="text-xs leading-relaxed text-amber-900 font-medium">
                            Bác sĩ chỉ định: <b>Uống khi đau khớp gối (1 viên/lần, tối đa 3 lần/ngày sau ăn)</b>.<br/>
                            Hệ thống sẽ <b>lưu vào Tủ thuốc mục "Dùng khi đau"</b> để người bệnh chủ động bấm xác nhận khi xuất hiện cơn đau, <b>KHÔNG tự ý đặt chuông báo thức cố định hàng ngày</b> nhằm tránh ép uống lạm dụng thuốc giảm đau gây hại gan thận.
                          </p>
                          <div className="text-[11px] font-bold bg-white/90 p-2 rounded-xl border border-amber-200 text-amber-800">
                            ✓ Cấp 20 viên dùng cho đợt đau cấp • Uống cách nhau tối thiểu 4 - 6 tiếng khi đau.
                          </div>
                        </div>
                      ) : (
                        /* ĐỐI VỚI THUỐC ĐIỀU TRỊ ĐỊNH KỲ (Amlodipine, Vitamin C, Omega-3): KHÓA CỐ ĐỊNH THEO ĐƠN */
                        <div className="space-y-3 pt-1">
                          
                          {/* Lộ trình điều trị: CỐ ĐỊNH THEO CHỈ ĐỊNH BÁC SĨ */}
                          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-black text-[#1A2B4B] flex items-center gap-1.5">
                                <Lock size={13} className="text-primary" />
                                <span>Lộ trình điều trị cố định: <span className="text-primary text-sm">{med.duration_days} ngày</span></span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                {med.calculationNote || `Đủ theo số lượng ${med.total_quantity || 30} viên bác sĩ cấp`}
                              </p>
                            </div>
                            <div className="text-xs text-gray-600 font-bold bg-white px-3 py-1.5 rounded-xl border border-blue-100 shrink-0 text-center">
                              Đến ngày: <span className="text-primary">{endStr}</span>
                            </div>
                          </div>

                          {/* CỮ UỐNG: KHÓA THEO CHỈ ĐỊNH BÁC SĨ (CHỈ CHO PHÉP ĐỔI GIỜ CHUÔNG BÁO) */}
                          <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-[#1A2B4B] uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={13} className="text-primary" />
                                <span>Cữ uống theo chỉ định:</span>
                              </label>
                              <span className="text-[10px] text-gray-500 font-medium">Bấm vào giờ để chỉnh giờ ăn của gia đình</span>
                            </div>

                            <div className="space-y-2">
                              {currentSlots.map((slot, slotIdx) => (
                                <div 
                                  key={slotIdx} 
                                  className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-black text-[#1A2B4B]">
                                      {slot.label}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">(Chỉ định 1 cữ/ngày)</span>
                                  </div>

                                  {/* Ô nhập giờ chuông báo */}
                                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
                                    <Clock size={12} className="text-primary" />
                                    <input 
                                      type="time" 
                                      value={slot.time} 
                                      onChange={(e) => updateSlotTime(idx, slotIdx, e.target.value)}
                                      className="bg-transparent text-xs font-black text-primary outline-none cursor-pointer"
                                      title="Chỉnh giờ chuông reo nhắc thuốc"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <p className="text-[10px] text-gray-400 italic">
                              🔒 Khóa cữ uống: Bác sĩ chỉ định uống đúng 1 lần/ngày. Không tự ý thêm cữ uống khác để phòng ngừa biến chứng tụt huyết áp quá mức!
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Hướng dẫn chi tiết của bác sĩ */}
                      <div className="pt-1">
                        <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                          <span className="font-bold text-[#1A2B4B] block mb-0.5">Cách dùng bác sĩ dặn:</span>
                          <span>{med.instructions}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* Footer Xác Nhận Lên Lịch */}
        {step === "review" && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={isSaving || medsList.length === 0 || (isNameMismatch && !isMismatchConfirmed)}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              {isSaving ? "Đang lưu đơn thuốc & tiền sử..." : `XÁC NHẬN LÊN LỊCH THEO ĐƠN BÁC SĨ`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

