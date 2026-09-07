import { useState, useEffect } from "react";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, MessageSquare } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  avatarUrl?: string;
  isSOS?: boolean;
  // Legacy aliases
  patientName?: string;
  patientPhone?: string;
  reminderNote?: string;
}

export default function CallModal({
  isOpen,
  onClose,
  contactName,
  contactRole,
  contactPhone,
  avatarUrl,
  isSOS = false,
  patientName,
  patientPhone,
  reminderNote = "Nhắc uống thuốc theo đúng lịch trình hôm nay"
}: Props) {
  const displayName = contactName || patientName || (isSOS ? "Người thân khẩn cấp" : "Người thân");
  const displayPhone = contactPhone || patientPhone || (isSOS ? "Đường dây ưu tiên SOS" : "0901 234 567");
  const displayRole = contactRole || (isSOS ? "Cuộc gọi SOS Khẩn cấp" : "Người chăm sóc");

  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ringing");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [aiVoiceActive, setAiVoiceActive] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCallStatus("ringing");
      setCallDuration(0);
      setAiVoiceActive(false);
      return;
    }

    // Tự động kết nối sau 2.5s để mô phỏng
    const ringTimer = setTimeout(() => {
      setCallStatus("connected");
    }, 2500);

    return () => clearTimeout(ringTimer);
  }, [isOpen]);

  useEffect(() => {
    let interval: any;
    if (isOpen && callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, callStatus]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white rounded-[36px] p-6 flex flex-col items-center justify-between min-h-[540px] shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className={`absolute top-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isSOS ? "bg-rose-500/30" : "bg-emerald-500/20"}`} />

        {/* Header Info */}
        <div className="flex flex-col items-center gap-3 pt-6 z-10 text-center">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 shadow-xl flex items-center justify-center bg-slate-800 ${
              isSOS 
                ? "border-rose-500 shadow-rose-900/50" 
                : "border-emerald-400/80 shadow-emerald-900/40"
            }`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {(displayName || "N")[0].toUpperCase()}
                </span>
              )}
            </div>
            {callStatus === "ringing" && (
              <span className={`absolute inset-0 rounded-full border-4 animate-ping opacity-75 ${
                isSOS ? "border-rose-500" : "border-emerald-400"
              }`} />
            )}
          </div>

          <div>
            <h3 className="text-2xl font-black text-white">{displayName}</h3>
            <p className={`font-medium text-xs mt-0.5 ${isSOS ? "text-rose-400 font-bold" : "text-emerald-300"}`}>
              {displayRole} • {displayPhone}
            </p>
          </div>

          <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold">
            {callStatus === "ringing" && (
              <span className="text-yellow-300 animate-pulse">Đang đổ chuông...</span>
            )}
            {callStatus === "connected" && (
              <span className="text-emerald-300">Đã kết nối • {formatTime(callDuration)}</span>
            )}
            {callStatus === "ended" && <span className="text-rose-400">Cuộc gọi đã kết thúc</span>}
          </div>
        </div>

        {/* Reminder / Emergency Prompt Card */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 z-10 my-4 text-left">
          <div className={`flex items-center gap-2 mb-1.5 text-xs font-bold ${isSOS ? "text-rose-400" : "text-emerald-400"}`}>
            <MessageSquare size={15} />
            <span>{isSOS ? "CUỘC GỌI KHẨN CẤP (SOS)" : "NỘI DUNG CUỘC GỌI"}</span>
          </div>
          <p className="text-white/90 text-sm font-semibold">
            {isSOS ? "Đang kết nối ưu tiên đến người nhà. Người nhận sẽ thấy thông báo rung chuông khẩn cấp." : reminderNote}
          </p>

          {/* AI Voice Assistant Trigger */}
          {callStatus === "connected" && !isSOS && (
            <button
              onClick={() => setAiVoiceActive(!aiVoiceActive)}
              className={`mt-2.5 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                aiVoiceActive
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-white/15 text-emerald-300 hover:bg-white/20"
              }`}
            >
              <Sparkles size={14} />
              {aiVoiceActive ? "AI đang phát giọng nhắc tự động..." : "Bật AI đọc lời nhắc tự động"}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-around z-10 pb-4">
          {/* Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-18 h-18 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl shadow-rose-900/50 transition-all cursor-pointer p-4"
          >
            <PhoneOff size={28} />
          </button>

          {/* Speaker */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isSpeaker ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {isSpeaker ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        </div>

      </div>
    </div>
  );
}
