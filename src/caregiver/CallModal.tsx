import { useState, useEffect, useRef } from "react";
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  MessageSquare,
  Video,
  VideoOff,
  SwitchCamera
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  avatarUrl?: string;
  isSOS?: boolean;
  initialVideo?: boolean;
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
  initialVideo = false,
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
  const [isVideo, setIsVideo] = useState(initialVideo);
  const [aiVoiceActive, setAiVoiceActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Setup video stream if video mode is enabled
  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn("Could not start camera for video call:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCallStatus("ringing");
      setCallDuration(0);
      setAiVoiceActive(false);
      stopCamera();
      return;
    }

    if (isVideo) {
      startCamera();
    }

    // Auto connect simulated call after 2s
    const ringTimer = setTimeout(() => {
      setCallStatus("connected");
    } , 2000);

    return () => {
      clearTimeout(ringTimer);
      stopCamera();
    };
  }, [isOpen, isVideo]);

  useEffect(() => {
    let interval: any;
    if (isOpen && callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, callStatus]);

  const toggleVideoMode = () => {
    if (!isVideo) {
      setIsVideo(true);
      startCamera();
    } else {
      setIsVideo(false);
      stopCamera();
    }
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    stopCamera();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white rounded-[36px] p-6 flex flex-col items-center justify-between min-h-[580px] shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className={`absolute top-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isSOS ? "bg-rose-500/30" : "bg-emerald-500/20"}`} />

        {/* Video stream container (if active) */}
        {isVideo ? (
          <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
            {/* Main view: Simulated remote video stream */}
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-900">
              <img
                src={avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&fit=crop"}
                alt={displayName}
                className="w-full h-full object-cover opacity-80 scale-105 filter blur-xs"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
              
              {/* Center remote speaking avatar */}
              <div className="absolute flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                  <img
                    src={avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop"}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-extrabold text-lg text-white drop-shadow-md">{displayName}</span>
              </div>
            </div>

            {/* Picture-in-Picture Local Camera Feed */}
            <div className="absolute top-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-slate-800 z-20">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-2 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-bold">
                Bạn
              </span>
            </div>
          </div>
        ) : (
          /* Voice Call Header Info */
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
        )}

        {/* Video Overlay Top Controls */}
        {isVideo && (
          <div className="w-full flex items-center justify-between z-10 pt-2 px-1">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-300 border border-white/10">
              {callStatus === "connected" ? `Video Call • ${formatTime(callDuration)}` : "Đang kết nối..."}
            </div>
            <button
              onClick={handleSwitchCamera}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90"
              title="Đổi camera"
            >
              <SwitchCamera size={16} />
            </button>
          </div>
        )}

        {/* Reminder Prompt Card (if not in video or minimized) */}
        {!isVideo && (
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 z-10 my-4 text-left">
            <div className={`flex items-center gap-2 mb-1.5 text-xs font-bold ${isSOS ? "text-rose-400" : "text-emerald-400"}`}>
              <MessageSquare size={15} />
              <span>{isSOS ? "CUỘC GỌI KHẨN CẤP (SOS)" : "NỘI DUNG CUỘC GỌI"}</span>
            </div>
            <p className="text-white/90 text-sm font-semibold">
              {isSOS ? "Đang kết nối ưu tiên đến người nhà. Người nhận sẽ thấy thông báo rung chuông khẩn cấp." : reminderNote}
            </p>

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
                <span>{aiVoiceActive ? "AI đang trợ lý cuộc gọi" : "Nhờ AI đọc lời nhắc thuốc"}</span>
              </button>
            )}
          </div>
        )}

        {/* Control Buttons */}
        <div className="w-full flex items-center justify-center gap-4 pt-2 z-20">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted ? "bg-rose-500 text-white" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isMuted ? "Bật micro" : "Tắt micro"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Video Call Button */}
          <button
            onClick={toggleVideoMode}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isVideo ? "bg-primary text-white" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isVideo ? "Tắt camera" : "Bật Video Call"}
          >
            {isVideo ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              !isSpeaker ? "bg-amber-500 text-white" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isSpeaker ? "Tắt loa ngoài" : "Bật loa ngoài"}
          >
            {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 transition-all cursor-pointer"
            title="Cúp máy"
          >
            <PhoneOff size={24} />
          </button>
        </div>

      </div>
    </div>
  );
}
