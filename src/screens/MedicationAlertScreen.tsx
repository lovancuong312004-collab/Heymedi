import { useState } from "react";
import { Bell, Volume2, Check, X, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { speakVietnamese } from "../utils/voiceAssistant";
import { supabase } from "../lib/supabase";
import { uploadPillProofImage } from "../services/medicationService";
import { verifyPillIntakeWithAI, cleanMedicineTitle } from "../utils/geminiVision";
import ElderlyCameraCaptureModal from "../components/ElderlyCameraCaptureModal";
import { cn } from "../lib/utils";

export interface AlertMedicineItem {
  id: string;
  name: string;
  dosage: string;
  instruction: string;
  imageUrl?: string | null;
  scheduled_time?: string;
  time?: string;
}

export interface DoseSessionAlert {
  time: string;
  mealLabel?: string;
  scheduled_time?: string;
  medicines: AlertMedicineItem[];
}

interface Props {
  medicine?: AlertMedicineItem;
  session?: DoseSessionAlert;
  patientName?: string;
  onTaken: (photoUrl?: string, reminderIds?: string[]) => void;
  onSnooze?: () => void; 
  verificationMode?: 'photo_required' | 'simple_only' | 'both';
}

export default function MedicationAlertScreen({ 
  medicine,
  session,
  patientName = "Bác",
  onTaken, 
  onSnooze,
  verificationMode 
}: Props) {
  const activeMode = verificationMode || (localStorage.getItem('heymedi_pill_verification_mode') as any) || 'both';
  
  // Chuẩn hóa danh sách thuốc trong cữ này
  const medicinesList: AlertMedicineItem[] = session?.medicines && session.medicines.length > 0
    ? session.medicines
    : medicine ? [medicine] : [];

  const timeDisplay = session?.time || medicine?.time || "08:00";
  const hourNum = parseInt(timeDisplay.split(':')[0], 10) || 8;
  const mealLabel = session?.mealLabel || (hourNum < 11 ? "Cữ Sáng (Sau ăn)" : hourNum < 15 ? "Cữ Trưa (Sau ăn)" : hourNum < 20 ? "Cữ Tối (Sau ăn)" : "Cữ Trước Ngủ");

  // Vị trí thuốc đang được chọn xem chi tiết (mặc định là thuốc đầu tiên)
  const [selectedMedIdx, setSelectedMedIdx] = useState<number>(0);
  const activeMed = medicinesList[selectedMedIdx] || medicinesList[0];

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [zoomedMed, setZoomedMed] = useState<AlertMedicineItem | null>(null);

  // Hàm làm sạch hướng dẫn uống thuốc: bỏ các đoạn lặp lại liều, lộ trình dài dòng
  const getConciseInstruction = (instr?: string): string => {
    if (!instr) return mealLabel || "Uống sau ăn";
    let cleaned = instr.split('|')[0].trim();
    cleaned = cleaned.replace(/^\[.*?\]\s*/, '');
    cleaned = cleaned.replace(/^(\d+\s*(?:viên|gói|viên nén|viên sủi|ống)\s*•?\s*)/i, '');
    if (cleaned.length > 40 || cleaned.toLowerCase().includes("lộ trình")) {
      return mealLabel || "Uống sau ăn";
    }
    return cleaned.trim() || mealLabel || "Uống sau ăn";
  };

  // Đọc hướng dẫn thuốc đang chọn hoặc toàn bộ cữ
  const handleHearMed = (med: AlertMedicineItem) => {
    const cleanName = cleanMedicineTitle(med.name);
    const conciseInstruction = getConciseInstruction(med.instruction);
    speakVietnamese(`Thuốc ${cleanName}, liều lượng ${med.dosage}, ${conciseInstruction}.`);
  };

  const handleHearFullSession = () => {
    if (medicinesList.length === 1) {
      handleHearMed(medicinesList[0]);
      return;
    }
    const cleanNames = medicinesList.map(m => cleanMedicineTitle(m.name)).join(", ");
    speakVietnamese(`Đã đến ${mealLabel} lúc ${timeDisplay}. Cữ này gồm ${medicinesList.length} loại thuốc: ${cleanNames}. Bác kiểm tra đủ thuốc rồi uống nhé!`);
  };

  const allReminderIds = medicinesList.map(m => m.id);

  const handleCameraCaptureComplete = async (blob: Blob, previewUrl: string) => {
    setPhotoPreview(previewUrl);
    setIsVerifying(true);
    setVerificationResult("AI đang đối chiếu các viên thuốc trên tay...");

    try {
      const allNames = medicinesList.map(m => cleanMedicineTitle(m.name)).join(", ");
      const allDosages = medicinesList.map(m => m.dosage).join(", ");

      // Chạy song song: upload ảnh lên Storage & kiểm tra AI Vision
      const [uploadedUrl, aiResult] = await Promise.all([
        uploadPillProofImage(blob, medicinesList[0]?.id || "session"),
        verifyPillIntakeWithAI(blob, allNames, allDosages)
      ]);

      if (aiResult.isRealAi) {
        if (aiResult.isPillDetected) {
          setVerificationResult(`✓ AI xác nhận: Đã nhận diện đủ thuốc cữ ${timeDisplay} (${aiResult.confidence}%)`);
        } else {
          setVerificationResult(`⚠️ AI lưu ý: ${aiResult.assessment}`);
        }
      } else {
        setVerificationResult(`✓ Đã xác nhận thuốc cữ ${timeDisplay}`);
      }

      // Gửi broadcast tới người chăm sóc kèm danh sách thuốc và ảnh minh chứng
      const nowIso = new Date().toISOString();
      const channel = supabase.channel('sos-emergency-alerts');
      await channel.send({
        type: 'broadcast',
        event: 'PILL_TAKEN_PROOF',
        payload: {
          reminder_id: medicinesList[0]?.id,
          reminder_ids: allReminderIds,
          session_time: timeDisplay,
          med_name: allNames,
          dosage: allDosages,
          photo_url: uploadedUrl,
          patient_name: patientName,
          ai_assessment: aiResult.assessment,
          ai_confidence: aiResult.confidence,
          scheduled_time: medicinesList[0]?.scheduled_time || nowIso,
          taken_at: nowIso,
          timestamp: nowIso
        }
      });

      setTimeout(() => {
        setIsVerifying(false);
        onTaken(uploadedUrl, allReminderIds);
      }, 1200);
    } catch (err) {
      console.error("Lỗi khi lưu ảnh minh chứng cữ thuốc:", err);
      setIsVerifying(false);
      onTaken(previewUrl, allReminderIds);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FFF9F8] flex flex-col justify-between p-4 sm:p-5 text-center font-sans max-h-[100dvh] overflow-hidden select-none animate-fade-in">
      
      {/* Nút đóng / hoãn báo lại */}
      {onSnooze && (
        <button 
          onClick={onSnooze}
          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 text-gray-500 active:scale-95 transition-all z-20 cursor-pointer"
          title="Hoãn báo lại"
        >
          <X size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* 1. Header: Chuông báo & Khung giờ Cữ thuốc (Gọn gàng, không chiếm quá nhiều chiều cao) */}
      <div className="flex flex-col items-center w-full shrink-0 pt-1">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-[#FF5C39] flex items-center justify-center shadow-md shrink-0">
            <Bell className="text-white fill-white" size={18} style={{ animation: "ring 1s ease-in-out infinite" }} />
          </div>
          <h1 className="text-xl font-black text-[#E11D1D] tracking-tight uppercase">
            Đến giờ uống thuốc!
          </h1>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-black text-[#0B1B47] leading-none tracking-tight">
            {timeDisplay}
          </span>
          <span className="text-xs font-black text-primary bg-[#EBF1FF] border border-blue-200 px-2.5 py-0.5 rounded-full">
            {mealLabel} • {medicinesList.length} loại thuốc
          </span>
        </div>
      </div>

      {/* 2. Danh sách các thuốc trong Cữ này (Co giãn linh hoạt, vừa vặn màn hình) */}
      <div className="flex-1 flex flex-col justify-center my-2 min-h-0 overflow-y-auto px-1">
        
        {/* NẾU CÓ TỪ 2 LOẠI THUỐC TRỞ LÊN: HIỂN THỊ DẠNG DANH SÁCH/TABS CHỌN THUỐC */}
        {medicinesList.length > 1 && (
          <div className="w-full mb-2">
            <p className="text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide text-left">
              Chạm vào thuốc để AI đọc hướng dẫn:
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {medicinesList.map((med, idx) => {
                const isSelected = idx === selectedMedIdx;
                const cleanName = cleanMedicineTitle(med.name);

                return (
                  <button
                    key={med.id || idx}
                    type="button"
                    onClick={() => {
                      setSelectedMedIdx(idx);
                      handleHearMed(med);
                    }}
                    className={cn(
                      "p-2 rounded-2xl border-2 text-left flex items-center gap-2 transition-all cursor-pointer active:scale-98 relative",
                      isSelected 
                        ? "bg-blue-50/90 border-primary shadow-sm" 
                        : "bg-white border-gray-200 hover:border-blue-200"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {med.imageUrl ? (
                        <img src={med.imageUrl} alt={cleanName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">💊</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-[#0B1B47] truncate">{cleanName}</h4>
                      <p className="text-[10px] font-bold text-primary truncate">{med.dosage}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* THẺ CHI TIẾT CỦA THUỐC ĐANG CHỌN (HOẶC THUỐC DUY NHẤT) */}
        {activeMed && (
          <div className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm border border-gray-200 flex flex-col items-center relative overflow-hidden">
            
            {/* Ảnh vỉ thuốc thực tế hoặc ảnh chụp xác minh */}
            {photoPreview ? (
              <div 
                onClick={() => setZoomedMed({ ...activeMed, imageUrl: photoPreview })}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md border-2 border-emerald-500 relative mb-2 cursor-pointer group active:scale-95 transition-transform"
                title="Bấm để phóng to xem rõ ảnh"
              >
                <img src={photoPreview} alt="Ảnh thuốc" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-bold">
                  🔍 Chạm xem to
                </div>
                {isVerifying && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-1">
                    <Loader2 size={20} className="animate-spin text-emerald-400 mb-1" />
                    <span className="text-[10px] font-bold">AI kiểm tra thuốc...</span>
                  </div>
                )}
                {verificationResult && (
                  <div className="absolute inset-0 bg-emerald-700/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-1 animate-fade-in">
                    <CheckCircle2 size={22} className="text-white mb-0.5" />
                    <span className="text-[10px] font-bold text-center leading-tight">{verificationResult}</span>
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => setZoomedMed(activeMed)}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-inner relative mb-2 overflow-hidden cursor-pointer hover:border-primary active:scale-95 transition-all group"
                title="Bấm để xem rõ ảnh vỉ thuốc"
              >
                {activeMed.imageUrl ? (
                  <>
                    <img src={activeMed.imageUrl} alt={activeMed.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[8px] text-center py-0.5 font-bold">
                      🔍 Xem to
                    </div>
                  </>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white shadow-xs flex items-center justify-center">
                    <span className="text-3xl">💊</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-primary font-bold text-[10px] uppercase tracking-widest mb-0.5">Tên thuốc</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0B1B47] mb-1 leading-tight text-center px-2">
              {cleanMedicineTitle(activeMed.name)}
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap justify-center mb-1">
              <span className="text-primary text-xs font-black bg-[#EBF1FF] px-3 py-1 rounded-xl">
                {activeMed.dosage}
              </span>
              <span className="text-gray-600 text-xs font-semibold bg-gray-100 px-3 py-1 rounded-xl">
                {getConciseInstruction(activeMed.instruction)}
              </span>
            </div>

            {activeMed.imageUrl && (
              <button
                type="button"
                onClick={() => setZoomedMed(activeMed)}
                className="text-[11px] font-bold text-primary hover:text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1 mt-0.5 cursor-pointer active:scale-95 transition-transform"
              >
                <span>🔍 Phóng to xem rõ vỉ thuốc</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* Modal Camera chụp ảnh minh chứng vỉ thuốc / cả cữ thuốc trên tay */}
      <ElderlyCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title={`Chụp Thuốc Cữ ${timeDisplay}`}
        subtitle="Đặt các viên thuốc trên tay hoặc đĩa để gửi cho con"
        guideText="ĐẶT ĐỦ CÁC VIÊN THUỐC CẦN UỐNG VÀO GIỮA KHUNG HÌNH"
        confirmButtonText="TIẾP TỤC XÁC NHẬN GỬI CHO CON"
        onCaptureComplete={handleCameraCaptureComplete}
      />

      {/* 3. Action Buttons CỐ ĐỊNH Ở ĐÁY (Không bao giờ bị trôi hoặc phải cuộn màn hình) */}
      <div className="w-full shrink-0 flex flex-col gap-2 pt-1 border-t border-gray-200/80">
        
        {/* Nút 1: Chụp ảnh xác minh gửi con */}
        {(activeMode === 'photo_required' || activeMode === 'both') && (
          <button
            onClick={() => setIsCameraOpen(true)}
            disabled={isVerifying}
            className="w-full bg-[#1C4ED8] hover:bg-blue-700 text-white py-3 px-4 rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border-b-4 border-blue-900"
          >
            <Camera size={18} />
            <span>📸 {activeMode === 'photo_required' ? "BẮT BUỘC CHỤP ẢNH THUỐC TRÊN TAY" : "ĐÃ UỐNG + CHỤP ẢNH GỬI CON (AI)"}</span>
          </button>
        )}

        {/* Nút 2: Xác nhận uống nhanh (Không cần chụp) */}
        {(activeMode === 'simple_only' || activeMode === 'both') && (
          <button
            onClick={() => onTaken(undefined, allReminderIds)}
            disabled={isVerifying}
            className="w-full bg-[#18A048] hover:bg-emerald-700 text-white py-3 px-4 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all uppercase tracking-wide cursor-pointer border-b-4 border-[#117C35]"
          >
            <Check size={18} strokeWidth={3} />
            <span>Tôi đã uống đủ cữ này {activeMode === 'both' ? "(Không chụp ảnh)" : ""}</span>
          </button>
        )}

        {/* Nút 3: Nghe lại hướng dẫn */}
        <button
          onClick={handleHearFullSession}
          className="w-full bg-white border border-[#D1DEFF] py-2 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xs cursor-pointer text-xs font-bold text-[#1C4ED8]"
        >
          <Volume2 size={16} />
          <span>Bấm để AI đọc lại toàn bộ thuốc cữ này</span>
        </button>
      </div>

      {/* MODAL PHÓNG TO XEM RÕ ẢNH VỈ/HỘP THUỐC CHO NGƯỜI GIÀ */}
      {zoomedMed && (
        <div 
          onClick={() => setZoomedMed(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] animate-slide-up cursor-default"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
                  Mặt vỉ thuốc thực tế
                </span>
                <h3 className="text-lg font-black text-[#1a2b4b]">
                  {cleanMedicineTitle(zoomedMed.name)}
                </h3>
              </div>
              <button
                onClick={() => setZoomedMed(null)}
                className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center min-h-[250px] max-h-[500px] overflow-hidden">
              {zoomedMed.imageUrl ? (
                <img 
                  src={zoomedMed.imageUrl} 
                  alt={zoomedMed.name} 
                  className="w-full h-full object-contain rounded-xl max-h-[480px]"
                />
              ) : (
                <div className="text-center text-white/70 py-10 space-y-2">
                  <span className="text-6xl block">💊</span>
                  <p className="text-xs">Chưa có ảnh vỉ thuốc thực tế trong hệ thống.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Liều lượng:</span>
                <span className="text-xs font-black text-primary bg-blue-50 px-2.5 py-1 rounded-lg">
                  {zoomedMed.dosage}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Cách dùng:</span>
                <span className="text-xs font-bold text-gray-800">
                  {getConciseInstruction(zoomedMed.instruction)}
                </span>
              </div>
              <button
                onClick={() => setZoomedMed(null)}
                className="w-full mt-2 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/25 cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes ring { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }`}</style>
    </div>
  );
}
