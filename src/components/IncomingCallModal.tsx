import { useEffect, useRef } from "react";
import { Phone, PhoneOff, AlertCircle } from "lucide-react";
import { startRingtone } from "../utils/voiceAssistant";

interface Props {
  isOpen: boolean;
  callerName: string;
  callerRole?: string;
  callerAvatar?: string;
  isSOS?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  isOpen,
  callerName,
  callerRole = "Người thân",
  callerAvatar,
  isSOS = false,
  onAccept,
  onDecline
}: Props) {
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Bật chuông reo du dương
      const stopSound = startRingtone();
      stopRingtoneRef.current = stopSound;

      // Tự động kết thúc nếu không ai nhấc máy sau 35s
      const timeout = setTimeout(() => {
        handleDecline();
      }, 35000);

      return () => {
        clearTimeout(timeout);
        if (stopRingtoneRef.current) {
          stopRingtoneRef.current();
          stopRingtoneRef.current = null;
        }
      };
    } else {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    onAccept();
  };

  const handleDecline = () => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    onDecline();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white rounded-[36px] p-6 flex flex-col items-center justify-between min-h-[520px] shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Glow hiệu ứng chuông */}
        <div className={`absolute top-0 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
          isSOS ? "bg-red-500/40" : "bg-emerald-500/30"
        }`} />

        {/* Tiêu đề trạng thái */}
        <div className="flex flex-col items-center gap-2 pt-6 z-10 text-center">
          {isSOS ? (
            <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg border border-red-400 animate-pulse">
              <AlertCircle size={16} />
              <span>CUỘC GỌI SOS KHẨN CẤP</span>
            </div>
          ) : (
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest animate-pulse">
              Cuộc gọi đến...
            </span>
          )}

          {/* Avatar với hiệu ứng vòng tròn sóng rung */}
          <div className="relative my-4">
            <div className={`w-28 h-28 rounded-full overflow-hidden border-4 shadow-2xl flex items-center justify-center bg-slate-800 relative z-10 ${
              isSOS ? "border-red-500 shadow-red-900/60" : "border-emerald-400 shadow-emerald-900/50"
            }`}>
              {callerAvatar ? (
                <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-extrabold text-white">
                  {(callerName || "N")[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Vòng lặp hiệu ứng chuông đổ */}
            <span className={`absolute inset-0 rounded-full border-4 animate-ping opacity-60 ${
              isSOS ? "border-red-500" : "border-emerald-400"
            }`} />
            <span className={`absolute -inset-3 rounded-full border-2 animate-pulse opacity-40 ${
              isSOS ? "border-red-400" : "border-emerald-300"
            }`} />
          </div>

          <h2 className="text-2xl font-black text-white">{callerName}</h2>
          <p className="text-slate-300 text-sm font-medium">{callerRole}</p>
        </div>

        {/* Gợi ý tương tác */}
        <p className="text-slate-400 text-xs text-center z-10 my-2">
          {isSOS ? "Người bệnh đang cần hỗ trợ y tế khẩn cấp!" : "Nhấn nút xanh để bắt đầu trò chuyện"}
        </p>

        {/* 2 Nút Trả Lời và Từ Chối To Rõ */}
        <div className="w-full flex items-center justify-around gap-6 pt-4 pb-2 z-20">
          {/* Nút Từ Chối */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleDecline}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-red-900/50 transition-all cursor-pointer border-2 border-red-400/50"
              title="Từ chối"
            >
              <PhoneOff size={28} />
            </button>
            <span className="text-xs font-bold text-slate-300">Từ chối</span>
          </div>

          {/* Nút Trả Lời (Nghe máy) */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all cursor-pointer border-2 border-emerald-300/60 animate-bounce"
              title="Nghe máy"
            >
              <Phone size={28} className="fill-white" />
            </button>
            <span className="text-xs font-bold text-emerald-400">Trả lời</span>
          </div>
        </div>

      </div>
    </div>
  );
}
