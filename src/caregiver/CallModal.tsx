import { useState, useEffect } from "react";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, MessageSquare } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  patientPhone?: string;
  reminderNote?: string;
}

export default function CallModal({
  isOpen,
  onClose,
  patientName = "Ông Minh",
  patientPhone = "0901 234 567",
  reminderNote = "Nhắc uống thuốc Metformin 500mg (cữ trưa 12:00)"
}: Props) {
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
        <div className="absolute top-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Info */}
        <div className="flex flex-col items-center gap-3 pt-6 z-10 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-400/60 shadow-xl shadow-emerald-900/30">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
                alt={patientName}
                className="w-full h-full object-cover"
              />
            </div>
            {callStatus === "ringing" && (
              <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-75" />
            )}
          </div>

          <div>
            <h3 className="text-2xl font-black text-white">{patientName}</h3>
            <p className="text-emerald-300 font-medium text-sm mt-0.5">{patientPhone}</p>
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

        {/* Reminder Prompt Card */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 z-10 my-4 text-left">
          <div className="flex items-center gap-2 mb-1.5 text-emerald-400 text-xs font-bold">
            <MessageSquare size={15} />
            <span>NỘI DUNG CẦN NHẮC</span>
          </div>
          <p className="text-white/90 text-sm font-semibold">{reminderNote}</p>

          {/* AI Voice Assistant Trigger */}
          {callStatus === "connected" && (
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
