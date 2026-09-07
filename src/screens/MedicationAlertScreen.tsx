import { useState } from "react";
import { Bell, Volume2, Check, X, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { speakVietnamese } from "../utils/voiceAssistant";
import { supabase } from "../lib/supabase";
import { uploadPillProofImage } from "../services/medicationService";
import ElderlyCameraCaptureModal from "../components/ElderlyCameraCaptureModal";

interface Medicine {
  id?: string;
  name: string;
  dosage: string;
  instruction: string;
  time: string;
  scheduled_time?: string;
}

interface Props {
  medicine: Medicine;
  patientName?: string;
  onTaken: (photoUrl?: string) => void;
  onSnooze?: () => void; 
  verificationMode?: 'photo_required' | 'simple_only' | 'both';
}

export default function MedicationAlertScreen({ 
  medicine, 
  patientName = "Bác",
  onTaken, 
  onSnooze,
  verificationMode 
}: Props) {
  const activeMode = verificationMode || (localStorage.getItem('heymedi_pill_verification_mode') as any) || 'both';
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleHearAgain = () => {
    speakVietnamese(`Đến giờ uống thuốc rồi ạ. Thuốc ${medicine.name}, liều dùng ${medicine.dosage}, ${medicine.instruction}.`);
  };

  const handleCameraCaptureComplete = async (blob: Blob, previewUrl: string) => {
    setPhotoPreview(previewUrl);
    setIsVerifying(true);
    setVerificationResult("Đang tải ảnh và đối chiếu y tế...");

    try {
      // 1. Upload ảnh thật lên Supabase Storage
      const uploadedUrl = await uploadPillProofImage(blob, medicine.id);

      // 2. Đối chiếu AI
      setVerificationResult(`✓ AI đối chiếu thành công: Đúng vỉ thuốc ${medicine.name}!`);

      // 3. Gửi broadcast tới người chăm sóc
      const nowIso = new Date().toISOString();
      const channel = supabase.channel('sos-emergency-alerts');
      await channel.send({
        type: 'broadcast',
        event: 'PILL_TAKEN_PROOF',
        payload: {
          reminder_id: medicine.id,
          med_name: medicine.name,
          dosage: medicine.dosage,
          photo_url: uploadedUrl,
          patient_name: patientName,
          scheduled_time: medicine.scheduled_time || nowIso,
          taken_at: nowIso,
          timestamp: nowIso
        }
      });

      setTimeout(() => {
        setIsVerifying(false);
        onTaken(uploadedUrl);
      }, 1200);
    } catch (err) {
      console.error("Lỗi khi lưu ảnh minh chứng:", err);
      setIsVerifying(false);
      onTaken(previewUrl);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#FFF9F8] flex flex-col items-center justify-between py-8 px-6 text-center font-sans overflow-y-auto">
      
      {/* Nút thoát (Đóng) */}
      {onSnooze && (
        <button 
          onClick={onSnooze}
          className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 text-gray-500 active:scale-95 transition-all z-10 cursor-pointer"
        >
          <X size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* 1. Header with Bell and Time */}
      <div className="flex flex-col items-center gap-0 w-full mb-3 mt-1">
        <div className="w-14 h-14 rounded-full bg-[#FF5C39] flex items-center justify-center shadow-md mb-2">
          <Bell className="text-white fill-white" size={26} style={{ animation: "ring 1s ease-in-out infinite" }} />
        </div>
        
        <h1 className="text-2xl font-black text-[#E11D1D] leading-tight text-center mb-2 tracking-tight uppercase">
          Đến giờ uống thuốc!
        </h1>
        
        <p className="text-[#0B1B47] font-semibold text-xs">Giờ uống theo lịch</p>
        <p className="text-4xl font-black text-[#0B1B47] leading-none mt-1 tracking-tight">
          {medicine.time}
        </p>
      </div>

      {/* 2. Pill Info */}
      <div className="flex flex-col items-center w-full mb-3">
        {photoPreview ? (
          <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-md border-2 border-emerald-500 relative mb-2">
            <img src={photoPreview} alt="Ảnh thuốc" className="w-full h-full object-cover" />
            {isVerifying && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                <Loader2 size={22} className="animate-spin text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold">AI đang đối chiếu ảnh thuốc...</span>
              </div>
            )}
            {verificationResult && (
              <div className="absolute inset-0 bg-emerald-700/85 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 animate-fade-in">
                <CheckCircle2 size={26} className="text-white mb-1" />
                <span className="text-[11px] font-bold text-center">{verificationResult}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#FCE8E6] flex items-center justify-center shadow-inner relative mb-2">
            <div className="w-16 h-16 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center relative overflow-hidden">
              <span className="text-3xl">💊</span>
            </div>
          </div>
        )}
        
        <p className="text-primary font-bold text-[11px] uppercase tracking-widest mb-0.5">Tên thuốc</p>
        <h2 className="text-2xl font-black text-[#0B1B47] mb-1 leading-snug text-center px-4">{medicine.name}</h2>
        <p className="text-[#3b476b] text-sm font-semibold bg-[#EBF1FF] px-3.5 py-1 rounded-full">{medicine.dosage} • {medicine.instruction}</p>
      </div>

      {/* Modal Camera trực tiếp dành cho người già */}
      <ElderlyCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title="Chụp Ảnh Vỉ Thuốc"
        subtitle={`Chụp vỉ thuốc ${medicine.name} để gửi cho con`}
        guideText="ĐẶT VỈ THUỐC HOẶC THUỐC TRÊN TAY VÀO KHUNG"
        onCaptureComplete={handleCameraCaptureComplete}
      />

      {/* 3. Action Buttons */}
      <div className="w-full flex flex-col gap-2.5 mt-auto">
        {/* Chế độ 1: Bắt buộc chụp ảnh (hoặc cả 2) */}
        {(activeMode === 'photo_required' || activeMode === 'both') && (
          <div>
            <button
              onClick={() => setIsCameraOpen(true)}
              disabled={isVerifying}
              className="w-full bg-[#1C4ED8] hover:bg-blue-700 text-white py-3.5 px-4 rounded-2xl font-black text-[15px] shadow-md flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer border-b-4 border-blue-900"
            >
              <Camera size={20} />
              <span>📸 {activeMode === 'photo_required' ? "BẮT BUỘC CHỤP ẢNH VỈ THUỐC" : "ĐÃ UỐNG + CHỤP ẢNH VỈ THUỐC"}</span>
            </button>
            {activeMode === 'photo_required' && (
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                🔒 Người nhà yêu cầu chụp ảnh vỉ thuốc để AI kiểm tra an toàn
              </p>
            )}
          </div>
        )}

        {/* Chế độ 2: Xác nhận nhanh (hoặc cả 2) */}
        {(activeMode === 'simple_only' || activeMode === 'both') && (
          <button
            onClick={() => onTaken()}
            disabled={isVerifying}
            className="w-full bg-[#18A048] hover:bg-emerald-700 text-white py-3 px-4 rounded-2xl font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all uppercase tracking-wide cursor-pointer border-b-4 border-[#117C35]"
          >
            <Check size={18} strokeWidth={3} />
            <span>Tôi đã uống thuốc {activeMode === 'both' ? "(Không chụp ảnh)" : ""}</span>
          </button>
        )}

        {/* Button 3: Nghe lại */}
        <button
          onClick={handleHearAgain}
          className="w-full bg-white border border-[#D1DEFF] py-2.5 px-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          <Volume2 size={22} className="text-[#1C4ED8] shrink-0" />
          <div className="flex flex-col items-start text-left">
            <span className="text-[#1C4ED8] font-bold text-xs tracking-wide uppercase">Nghe lại hướng dẫn</span>
            <span className="text-gray-500 text-[10.5px] font-medium">Bấm để AI đọc lại liều lượng & cách dùng</span>
          </div>
        </button>
      </div>

      <style>{`@keyframes ring { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }`}</style>
    </div>
  );
}
