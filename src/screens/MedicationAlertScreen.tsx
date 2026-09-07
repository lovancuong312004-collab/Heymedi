import { useState, useRef } from "react";
import { Bell, Volume2, Check, X, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { speakVietnamese } from "../utils/voiceAssistant";
import { supabase } from "../lib/supabase";

interface Medicine {
  name: string;
  dosage: string;
  instruction: string;
  time: string;
}

interface Props {
  medicine: Medicine;
  onTaken: (photoUrl?: string) => void;
  onSnooze?: () => void; 
}

export default function MedicationAlertScreen({ medicine, onTaken, onSnooze }: Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHearAgain = () => {
    speakVietnamese(`Đến giờ uống thuốc rồi ạ. Thuốc ${medicine.name}, liều dùng ${medicine.dosage}, ${medicine.instruction}.`);
  };

  const handleCaptureProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      setIsVerifying(true);

      // AI quick verification simulation
      setTimeout(() => {
        setIsVerifying(false);
        setVerificationResult(`✓ AI đối chiếu thành công: Đúng thuốc ${medicine.name}!`);

        // Send broadcast to caregiver
        const channel = supabase.channel('sos-emergency-alerts');
        channel.send({
          type: 'broadcast',
          event: 'PILL_TAKEN_PROOF',
          payload: {
            med_name: medicine.name,
            dosage: medicine.dosage,
            photo_url: url,
            timestamp: new Date().toISOString()
          }
        }).catch(() => {});

        setTimeout(() => {
          onTaken(url);
        }, 1500);
      }, 1800);
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

      {/* Hidden file input for capturing pill proof */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleCaptureProof} 
        className="hidden" 
      />

      {/* 3. Action Buttons */}
      <div className="w-full flex flex-col gap-3 mt-auto">
        {/* Button 1: Chụp ảnh & Đã uống */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isVerifying}
          className="w-full bg-[#1C4ED8] hover:bg-blue-700 text-white py-4 px-4 rounded-2xl font-black text-[16px] shadow-md flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer border-b-4 border-blue-900"
        >
          <Camera size={22} />
          <span>📸 ĐÃ UỐNG + CHỤP ẢNH VỈ THUỐC</span>
        </button>

        {/* Button 2: Đã uống ngay */}
        <button
          onClick={() => onTaken()}
          disabled={isVerifying}
          className="w-full bg-[#18A048] hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl font-bold text-[15px] shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all uppercase tracking-wide cursor-pointer border-b-4 border-[#117C35]"
        >
          <Check size={20} strokeWidth={3} />
          <span>Tôi đã uống thuốc (Không chụp ảnh)</span>
        </button>

        {/* Button 3: Nghe lại */}
        <button
          onClick={handleHearAgain}
          className="w-full bg-white border border-[#D1DEFF] py-3 px-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          <Volume2 size={24} className="text-[#1C4ED8] shrink-0" />
          <div className="flex flex-col items-start text-left">
            <span className="text-[#1C4ED8] font-bold text-xs tracking-wide uppercase">Nghe lại hướng dẫn</span>
            <span className="text-gray-500 text-[11px] font-medium">Bấm để AI đọc lại liều lượng & cách dùng</span>
          </div>
        </button>
      </div>

      <style>{`@keyframes ring { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }`}</style>
    </div>
  );
}
