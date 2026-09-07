import { useState, useRef, useEffect } from "react";
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
  Plus
} from "lucide-react";
import { 
  analyzePrescription, 
  type ParsedMedication, 
  type MealRelation
} from "../utils/geminiVision";
import { addMedicationWithCourse } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Danh mục cữ uống chuẩn lâm sàng y khoa
const CLINICAL_PRESETS: { label: string; mealRelation: MealRelation; defaultTime: string; desc: string }[] = [
  { label: "Sáng (Sau ăn)", mealRelation: "sau_an", defaultTime: "08:00", desc: "Sau ăn sáng 30p" },
  { label: "Sáng (Trước ăn)", mealRelation: "truoc_an", defaultTime: "06:45", desc: "Trước ăn sáng 30p" },
  { label: "Trưa (Sau ăn)", mealRelation: "sau_an", defaultTime: "12:30", desc: "Sau ăn trưa 30p" },
  { label: "Tối (Sau ăn)", mealRelation: "sau_an", defaultTime: "19:30", desc: "Sau ăn tối 30p" },
  { label: "Trước khi đi ngủ", mealRelation: "truoc_ngu", defaultTime: "21:30", desc: "Trước giờ ngủ" },
  { label: "Khi đau / Cần", mealRelation: "khi_dau", defaultTime: "12:30", desc: "Dùng theo cơn đau" },
];

export default function ScanPrescriptionModal({ isOpen, onClose, onSuccess }: Props) {
  const { linkedPatientId } = useFamily();
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
        setScanStageText("⏱️ Khớp cữ uống (Trước/Sau ăn/Trước ngủ) & Tính lộ trình...");
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
        // Chạy phân tích AI song song với hiệu ứng quét trực quan
        const [result] = await Promise.all([
          analyzePrescription(file),
          new Promise((resolve) => setTimeout(resolve, 2800)) // Đảm bảo hiệu ứng quét chạy mượt mà 2.8s
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

  const updateMed = (index: number, field: keyof ParsedMedication, value: any) => {
    setMedsList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  // Cập nhật giờ cụ thể cho một cữ
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

  // Thêm một cữ lâm sàng vào thuốc
  const addSlotToMed = (medIdx: number, preset: typeof CLINICAL_PRESETS[0]) => {
    setMedsList(prev => {
      const newList = [...prev];
      const targetMed = { ...newList[medIdx] };
      const currentSlots = targetMed.slots ? [...targetMed.slots] : [];
      
      // Kiểm tra nếu đã có cữ này
      if (!currentSlots.some(s => s.label === preset.label)) {
        currentSlots.push({
          label: preset.label,
          mealRelation: preset.mealRelation,
          time: preset.defaultTime
        });
        targetMed.slots = currentSlots;
        targetMed.times = currentSlots.map(s => s.time);
      }
      newList[medIdx] = targetMed;
      return newList;
    });
  };

  // Xóa một cữ khỏi thuốc
  const removeSlotFromMed = (medIdx: number, slotIdx: number) => {
    setMedsList(prev => {
      const newList = [...prev];
      const targetMed = { ...newList[medIdx] };
      const currentSlots = targetMed.slots ? [...targetMed.slots] : [];
      if (currentSlots.length > 1) {
        currentSlots.splice(slotIdx, 1);
        targetMed.slots = currentSlots;
        targetMed.times = currentSlots.map(s => s.time);
        newList[medIdx] = targetMed;
      } else {
        alert("Mỗi thuốc cần có ít nhất một cữ uống trong ngày!");
      }
      return newList;
    });
  };

  // Lưu toàn bộ thuốc và tạo lịch nhắc
  const handleSaveAll = async () => {
    if (!linkedPatientId) {
      alert("Lỗi: Không tìm thấy ID bệnh nhân liên kết");
      return;
    }
    if (medsList.length === 0) {
      alert("Không có thuốc nào để lưu");
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

      for (const med of medsList) {
        const times = med.times && med.times.length > 0 ? med.times : ["08:00"];
        const duration = med.duration_days && med.duration_days > 0 ? med.duration_days : 30;
        
        // Tạo ghi chú cách dùng đầy đủ
        const slotsDesc = (med.slots || []).map(s => `${s.label} lúc ${s.time}`).join(", ");
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
      
      alert(`🎉 Đã lên lịch thành công ${medsList.length} loại thuốc theo đúng đơn khám bác sĩ!\nTổng cộng đã kích hoạt: ${totalRemindersCreated} lần chuông nhắc tự động.`);
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
              
              {/* Card Tóm tắt thông tin đơn thuốc bác sĩ */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/90 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-primary font-black text-sm">
                      <Building2 size={15} />
                      <span>{prescriptionMeta.hospitalName || "BỆNH VIỆN ĐA KHOA AN KHANG"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        <b>Bệnh nhân:</b> {prescriptionMeta.patientName || "Bác Ba"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope size={12} className="text-gray-400" />
                        <b>Bác sĩ:</b> {prescriptionMeta.doctorName || "BS. Trần Minh Khang"}
                      </span>
                    </div>
                    {prescriptionMeta.diagnosis && (
                      <p className="text-xs text-gray-700 mt-1">
                        <b>Chẩn đoán:</b> {prescriptionMeta.diagnosis}
                      </p>
                    )}
                  </div>

                  {/* Nút Xem lại ảnh gốc */}
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => setShowOriginalPhoto(!showOriginalPhoto)}
                      className="flex items-center gap-1 bg-white hover:bg-blue-50 text-primary border border-blue-200 text-xs font-bold px-2.5 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-sm transition-all"
                    >
                      <Eye size={13} />
                      <span>{showOriginalPhoto ? "Thu nhỏ ảnh" : "Xem ảnh gốc"}</span>
                      {showOriginalPhoto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {/* Khung mở rộng xem ảnh gốc */}
                {showOriginalPhoto && imagePreview && (
                  <div className="pt-2 border-t border-blue-200/60 mt-2 animate-fade-in">
                    <p className="text-[11px] text-gray-500 font-semibold mb-1.5">Ảnh đơn thuốc gốc để đối chiếu:</p>
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-300 bg-black/5 p-1">
                      <img src={imagePreview} alt="Đơn thuốc gốc" className="w-full h-auto rounded-lg" />
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh tiêu đề số lượng thuốc và nút chụp lại */}
              <div className="flex justify-between items-center px-1">
                <span className="font-extrabold text-[#1A2B4B] text-sm sm:text-base">
                  Danh sách {medsList.length} loại thuốc được chỉ định
                </span>
                <button 
                  onClick={resetState} 
                  className="text-xs text-primary font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  Chụp đơn khác
                </button>
              </div>

              {/* Danh sách các thẻ thuốc chi tiết */}
              <div className="space-y-4">
                {medsList.map((med, idx) => {
                  const currentSlots = med.slots || [];
                  const activePresetLabels = currentSlots.map(s => s.label);
                  const availablePresetsToAdd = CLINICAL_PRESETS.filter(p => !activePresetLabels.includes(p.label));

                  // Tính toán ngày kết thúc dự kiến
                  const startD = new Date(commonStartDate);
                  const endD = new Date(startD);
                  endD.setDate(endD.getDate() + (med.duration_days || 30) - 1);
                  const endStr = `${String(endD.getDate()).padStart(2, '0')}/${String(endD.getMonth() + 1).padStart(2, '0')}/${endD.getFullYear()}`;

                  return (
                    <div key={idx} className="bg-white border-2 border-gray-200 rounded-3xl p-4 sm:p-5 relative space-y-3.5 shadow-sm hover:border-blue-300 transition-all">
                      
                      {/* Nút Xóa thuốc */}
                      <button 
                        onClick={() => removeMed(idx)}
                        className="absolute top-3 right-3 w-8 h-8 bg-white text-rose-500 border border-red-200 shadow-sm rounded-full flex items-center justify-center hover:bg-red-50 cursor-pointer"
                        title="Xóa thuốc này khỏi danh sách"
                      >
                        <Trash2 size={15} />
                      </button>

                      {/* Header thẻ: Tên thuốc & Dạng bào chế */}
                      <div className="pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Thuốc #{idx + 1}
                          </span>
                          {med.form && (
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              Dạng: {med.form}
                            </span>
                          )}
                          {med.total_quantity && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                              Cấp: {med.total_quantity} viên
                            </span>
                          )}
                        </div>
                        <input 
                          value={med.name} 
                          onChange={(e) => updateMed(idx, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-base font-black text-[#1A2B4B] focus:border-primary outline-none"
                          placeholder="Tên thuốc và hàm lượng"
                        />
                      </div>

                      {/* Liều mỗi lần & Lộ trình điều trị */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        
                        {/* Liều lượng */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                            Liều mỗi lần uống
                          </label>
                          <input 
                            value={med.dosage} 
                            onChange={(e) => updateMed(idx, 'dosage', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1A2B4B] focus:border-primary outline-none"
                          />
                        </div>

                        {/* Lộ trình điều trị (Chuẩn y khoa) */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>Lộ trình điều trị</span>
                            <span className="text-gray-400 font-normal lowercase">Đến: {endStr}</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              min="1"
                              max="365"
                              value={med.duration_days || 30} 
                              onChange={(e) => updateMed(idx, 'duration_days', parseInt(e.target.value) || 30)}
                              className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-primary focus:border-primary outline-none text-center"
                            />
                            <span className="text-xs text-gray-600 font-bold shrink-0">ngày</span>
                            
                            {/* Nút chọn nhanh lộ trình */}
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                              {[7, 10, 14, 30].map(d => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => updateMed(idx, 'duration_days', d)}
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer shrink-0",
                                    med.duration_days === d 
                                      ? "bg-primary text-white border-primary" 
                                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                                  )}
                                >
                                  {d}d
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cơ sở tính lộ trình */}
                      {med.calculationNote && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1.5 font-medium flex items-center gap-1.5">
                          <span>💡</span>
                          <span>{med.calculationNote}</span>
                        </p>
                      )}

                      {/* KHUNG CỮ UỐNG, BỮA ĂN VÀ GIỜ BÁO ĐỘNG (RẤT QUAN TRỌNG) */}
                      <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-[#1A2B4B] uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={13} className="text-primary" />
                            <span>Cữ uống & Giờ hẹn chuông báo:</span>
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium">Bấm vào giờ để chỉnh sửa</span>
                        </div>

                        {/* Danh sách các cữ đang hoạt động kèm ô chỉnh giờ */}
                        <div className="space-y-2">
                          {currentSlots.map((slot, slotIdx) => (
                            <div 
                              key={slotIdx} 
                              className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-2.5 h-2.5 rounded-full",
                                  slot.mealRelation === "truoc_an" ? "bg-amber-400" :
                                  slot.mealRelation === "truoc_ngu" ? "bg-indigo-400" :
                                  slot.mealRelation === "khi_dau" ? "bg-rose-400" : "bg-emerald-400"
                                )} />
                                <span className="text-xs font-black text-[#1A2B4B]">
                                  {slot.label}
                                </span>
                              </div>

                              {/* Ô nhập giờ chuông báo */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-blue-50/70 border border-blue-200 px-2 py-1 rounded-lg">
                                  <Clock size={12} className="text-primary" />
                                  <input 
                                    type="time" 
                                    value={slot.time} 
                                    onChange={(e) => updateSlotTime(idx, slotIdx, e.target.value)}
                                    className="bg-transparent text-xs font-black text-primary outline-none cursor-pointer"
                                  />
                                </div>

                                {/* Nút gỡ cữ */}
                                <button
                                  type="button"
                                  onClick={() => removeSlotFromMed(idx, slotIdx)}
                                  className="w-6 h-6 rounded-md hover:bg-gray-100 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Gỡ cữ này"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Các cữ khác có thể thêm nhanh */}
                        {availablePresetsToAdd.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] text-gray-400 font-bold block mb-1">+ Thêm cữ khác:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {availablePresetsToAdd.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => addSlotToMed(idx, preset)}
                                  className="text-[10px] font-bold bg-white text-gray-600 border border-dashed border-gray-300 hover:border-primary hover:text-primary px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={10} />
                                  <span>{preset.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hướng dẫn chi tiết */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                          Hướng dẫn dùng của bác sĩ
                        </label>
                        <input 
                          value={med.instructions} 
                          onChange={(e) => updateMed(idx, 'instructions', e.target.value)}
                          placeholder="VD: Uống sau ăn sáng 30 phút để ổn định huyết áp"
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#1A2B4B] focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nút Thêm thuốc thủ công nếu đơn còn thiếu */}
              <button
                type="button"
                onClick={() => {
                  setMedsList(prev => [
                    ...prev,
                    {
                      name: "",
                      dosage: "1 viên",
                      form: "Viên nén",
                      slots: [{ label: "Sáng (Sau ăn)", mealRelation: "sau_an", time: "08:00" }],
                      times: ["08:00"],
                      time: "Sáng (Sau ăn)",
                      duration_days: 30,
                      instructions: "Uống sau ăn",
                      calculationNote: "Lộ trình 30 ngày"
                    }
                  ]);
                }}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                + Thêm loại thuốc khác vào đơn này
              </button>
            </div>
          )}
        </div>

        {/* Footer Xác Nhận Lên Lịch */}
        {step === "review" && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={isSaving || medsList.length === 0}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-70 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              {isSaving ? "Đang lên lịch tự động..." : `XÁC NHẬN LÊN LỊCH ${medsList.length} LOẠI THUỐC`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

