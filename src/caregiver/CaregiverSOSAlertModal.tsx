import { useEffect, useRef } from "react";
import { AlertTriangle, MapPin, Phone, VolumeX, ShieldAlert } from "lucide-react";
import { startSirenAlarm } from "../utils/voiceAssistant";

export interface SOSAlertPayload {
  patient_id: string;
  patient_name: string;
  lat?: number | null;
  lng?: number | null;
  google_maps_url?: string | null;
  timestamp?: string;
}

interface Props {
  alertData: SOSAlertPayload | null;
  onDismiss: () => void;
  onOpenCall?: () => void;
}

export default function CaregiverSOSAlertModal({
  alertData,
  onDismiss,
  onOpenCall
}: Props) {
  const stopSirenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (alertData) {
      stopSirenRef.current = startSirenAlarm();
    } else {
      if (stopSirenRef.current) {
        stopSirenRef.current();
        stopSirenRef.current = null;
      }
    }

    return () => {
      if (stopSirenRef.current) {
        stopSirenRef.current();
        stopSirenRef.current = null;
      }
    };
  }, [alertData]);

  if (!alertData) return null;

  const handleDismiss = () => {
    if (stopSirenRef.current) {
      stopSirenRef.current();
      stopSirenRef.current = null;
    }
    onDismiss();
  };

  const handleOpenMap = () => {
    const url = alertData.google_maps_url || 
      (alertData.lat && alertData.lng ? `https://www.google.com/maps?q=${alertData.lat},${alertData.lng}` : null);
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Không có dữ liệu tọa độ GPS khả dụng.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-red-600 text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-pulse overflow-y-auto">
      
      {/* Top Banner */}
      <div className="w-full flex items-center justify-center pt-2">
        <div className="bg-black/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/40 flex items-center gap-2">
          <ShieldAlert size={20} className="text-amber-300 animate-bounce" />
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-white">
            BÁO ĐỘNG ĐỎ KHẨN CẤP TỪ HỆ THỐNG
          </span>
        </div>
      </div>

      {/* Main Alert Info */}
      <div className="flex flex-col items-center max-w-md w-full text-center my-6 space-y-6">
        
        {/* Pulsing Icon */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-white text-danger flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.8)] animate-bounce">
            <AlertTriangle size={72} strokeWidth={2.5} className="text-red-600" />
          </div>
          <span className="absolute inset-0 rounded-full border-8 border-white/60 animate-ping pointer-events-none" />
        </div>

        {/* Big Alert Text */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight uppercase drop-shadow-md">
            🚨 {alertData.patient_name} ĐANG GỌI CẤP CỨU!
          </h1>
          <p className="text-white/95 text-base sm:text-lg font-bold">
            Người bệnh vừa bấm nút SOS khẩn cấp. Hãy lập tức liên hệ và kiểm tra an toàn!
          </p>
        </div>

        {/* GPS Location Box */}
        {alertData.lat && alertData.lng ? (
          <div className="w-full bg-black/40 backdrop-blur-md border border-white/30 rounded-3xl p-5 text-left space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-amber-300 font-black text-sm uppercase tracking-wider">
              <MapPin size={18} />
              <span>TỌA ĐỘ GPS CỦA BỆNH NHÂN</span>
            </div>
            
            <p className="text-white/90 text-sm font-mono font-bold">
              Vĩ độ: {alertData.lat.toFixed(6)} • Kinh độ: {alertData.lng.toFixed(6)}
            </p>

            <button
              onClick={handleOpenMap}
              className="w-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-base py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <MapPin size={22} className="fill-slate-950" />
              <span>📍 XEM VỊ TRÍ TRÊN BẢN ĐỒ</span>
            </button>
          </div>
        ) : (
          <div className="w-full bg-black/30 rounded-2xl p-4 text-xs font-semibold text-white/80">
            Không thể lấy tọa độ GPS chính xác lúc gửi (Thiết bị có thể tắt định vị).
          </div>
        )}

      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 pb-2">
        {onOpenCall && (
          <button
            onClick={() => {
              if (stopSirenRef.current) stopSirenRef.current();
              onOpenCall();
            }}
            className="w-full bg-white hover:bg-white/95 text-red-600 font-black text-xl py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer uppercase"
          >
            <Phone size={24} className="fill-red-600" />
            <span>GỌI ĐIỆN THOẠI NGAY</span>
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="w-full bg-black/40 hover:bg-black/50 border border-white/40 text-white font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer tracking-wider uppercase"
        >
          <VolumeX size={18} />
          <span>TẮT BÁO ĐỘNG / TÔI ĐÃ NHẬN TIN</span>
        </button>
      </div>

    </div>
  );
}
