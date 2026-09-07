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
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // User info
  currentUser?: any;
  targetId?: string;
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  avatarUrl?: string;
  isSOS?: boolean;
  initialVideo?: boolean;
  callId?: string;
  isInitiator?: boolean; // true: Người bắt đầu gọi, false: Người nhận cuộc gọi
  // Legacy aliases
  patientName?: string;
  patientPhone?: string;
  reminderNote?: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export default function CallModal({
  isOpen,
  onClose,
  currentUser,
  targetId,
  contactName,
  contactRole,
  contactPhone,
  avatarUrl,
  isSOS = false,
  initialVideo = true,
  callId,
  isInitiator = true,
  patientName,
  patientPhone,
  reminderNote = "Nhắc uống thuốc theo đúng lịch trình hôm nay"
}: Props) {
  const displayName = contactName || patientName || (isSOS ? "Người thân khẩn cấp" : "Người thân");
  const displayPhone = contactPhone || patientPhone || (isSOS ? "Đường dây ưu tiên SOS" : "0901 234 567");
  const displayRole = contactRole || (isSOS ? "Cuộc gọi SOS Khẩn cấp" : "Người chăm sóc");

  const [activeCallId, setActiveCallId] = useState<string>(callId || "");
  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">(isInitiator ? "ringing" : "connected");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [callDuration, setCallDuration] = useState(0);
  
  // Real Media Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideo, setIsVideo] = useState(initialVideo);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [aiVoiceActive, setAiVoiceActive] = useState(false);

  // WebRTC & Media Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  // Dừng toàn bộ Media Stream và đóng PeerConnection
  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setHasRemoteStream(false);
  };

  // Khởi động Camera và Micro thực tế
  const getLocalMedia = async (mode: "user" | "environment" = facingMode) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo ? { facingMode: mode } : false,
          audio: true
        });
      } catch (vidErr) {
        console.warn("Could not get video track, fallback to audio only:", vidErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        setIsVideo(false);
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (e) {
      console.warn("No camera/microphone found or access denied:", e);
      return null;
    }
  };

  // Thiết lập kết nối WebRTC truyền âm thanh và hình ảnh thực tế
  const setupWebRTC = async (channel: any, currentId: string, asCaller: boolean) => {
    try {
      const stream = await getLocalMedia();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Thêm các track local vào kết nối
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      // Nhận luồng Audio/Video thực tế từ máy đối phương
      pc.ontrack = (event) => {
        console.log("WebRTC ontrack received:", event.track.kind);
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasRemoteStream(true);
        }
      };

      // Gửi ICE Candidate cho đối phương qua Supabase Broadcast
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ICE',
            payload: {
              call_id: currentId,
              candidate: event.candidate
            }
          }).catch(() => {});
        }
      };

      // Nếu là bên gọi (Caller) -> Tạo Offer
      if (asCaller) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        channel.send({
          type: 'broadcast',
          event: 'WEBRTC_OFFER',
          payload: {
            call_id: currentId,
            sdp: offer
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("WebRTC setup error:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCallStatus(isInitiator ? "ringing" : "connected");
      setCallDuration(0);
      setAiVoiceActive(false);
      setStatusMessage("");
      cleanupMedia();
      return;
    }

    const currentId = callId || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveCallId(currentId);

    const channel = supabase.channel('sos-emergency-alerts');
    channelRef.current = channel;

    if (isInitiator) {
      setCallStatus("ringing");
      // Bắn tín hiệu INCOMING_CALL cho đối phương
      const callerName = currentUser?.user_metadata?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : "Người thân");
      channel.send({
        type: 'broadcast',
        event: 'INCOMING_CALL',
        payload: {
          call_id: currentId,
          caller_id: currentUser?.id,
          caller_name: callerName,
          caller_role: currentUser?.user_metadata?.role || "Gia đình",
          caller_avatar: currentUser?.user_metadata?.avatar_url,
          target_id: targetId,
          is_sos: isSOS,
          initial_video: isVideo,
          timestamp: new Date().toISOString()
        }
      }).catch(e => console.warn("Failed to broadcast incoming call:", e));

      // Hết 35 giây không ai nhấc máy -> Ghi nhận cuộc gọi nhỡ và tự ngắt
      const timeout = setTimeout(() => {
        setCallStatus("ended");
        setStatusMessage("Người nhận không trả lời (Đã ghi nhận cuộc gọi nhỡ)");
        setTimeout(() => onClose(), 1500);
      }, 35000);

      // Lắng nghe chấp nhận, từ chối hoặc kết thúc
      channel
        .on('broadcast', { event: 'CALL_ACCEPTED' }, async (ev) => {
          if (ev.payload?.call_id === currentId) {
            clearTimeout(timeout);
            setCallStatus("connected");
            await setupWebRTC(channel, currentId, true);
          }
        })
        .on('broadcast', { event: 'CALL_REJECTED' }, (ev) => {
          if (ev.payload?.call_id === currentId) {
            clearTimeout(timeout);
            setCallStatus("ended");
            setStatusMessage("Người nhận bận (Cuộc gọi bị từ chối)");
            setTimeout(() => onClose(), 1800);
          }
        })
        .on('broadcast', { event: 'CALL_ENDED' }, (ev) => {
          if (ev.payload?.call_id === currentId) {
            clearTimeout(timeout);
            setCallStatus("ended");
            setStatusMessage("Cuộc gọi đã kết thúc");
            setTimeout(() => onClose(), 1200);
          }
        })
        .on('broadcast', { event: 'WEBRTC_ANSWER' }, async (ev) => {
          if (ev.payload?.call_id === currentId && pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(ev.payload.sdp));
            } catch (e) {
              console.warn("Failed to set remote description on caller:", e);
            }
          }
        })
        .on('broadcast', { event: 'WEBRTC_ICE' }, async (ev) => {
          if (ev.payload?.call_id === currentId && pcRef.current && ev.payload.candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(ev.payload.candidate));
            } catch (e) {}
          }
        })
        .subscribe();

      return () => {
        clearTimeout(timeout);
        cleanupMedia();
      };
    } else {
      // Người nhận cuộc gọi (Callee): Bắt đầu ở trạng thái connected
      setCallStatus("connected");
      setupWebRTC(channel, currentId, false);

      channel
        .on('broadcast', { event: 'WEBRTC_OFFER' }, async (ev) => {
          if (ev.payload?.call_id === currentId && pcRef.current) {
            try {
              const pc = pcRef.current;
              await pc.setRemoteDescription(new RTCSessionDescription(ev.payload.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: 'broadcast',
                event: 'WEBRTC_ANSWER',
                payload: {
                  call_id: currentId,
                  sdp: answer
                }
              }).catch(() => {});
            } catch (e) {
              console.warn("Failed to handle WebRTC offer:", e);
            }
          }
        })
        .on('broadcast', { event: 'WEBRTC_ICE' }, async (ev) => {
          if (ev.payload?.call_id === currentId && pcRef.current && ev.payload.candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(ev.payload.candidate));
            } catch (e) {}
          }
        })
        .on('broadcast', { event: 'CALL_ENDED' }, (ev) => {
          if (ev.payload?.call_id === currentId) {
            setCallStatus("ended");
            setStatusMessage("Cuộc gọi đã kết thúc");
            setTimeout(() => onClose(), 1200);
          }
        })
        .subscribe();

      return () => {
        cleanupMedia();
      };
    }
  }, [isOpen, callId, isInitiator]);

  // Bộ đếm thời gian khi cuộc gọi kết nối
  useEffect(() => {
    let interval: any;
    if (isOpen && callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, callStatus]);

  // Bật/Tắt Micro thực tế (Mute/Unmute Audio Track)
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
    }
  };

  // Bật/Tắt Camera thực tế (Video Track)
  const toggleVideoMode = () => {
    const next = !isVideo;
    setIsVideo(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = next;
      });
    }
  };

  // Bật/Tắt Loa ngoài thực tế (Mute Remote Audio)
  const toggleSpeaker = () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !next;
    }
  };

  // Chuyển đổi Camera trước / sau
  const handleSwitchCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    getLocalMedia(nextMode);
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    cleanupMedia();

    // Broadcast kết thúc cuộc gọi cho máy đối phương
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'CALL_ENDED',
        payload: {
          call_id: activeCallId,
          ended_by_id: currentUser?.id
        }
      }).catch(() => {});
    }

    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white rounded-[36px] p-5 flex flex-col items-center justify-between min-h-[580px] shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className={`absolute top-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isSOS ? "bg-rose-500/30" : "bg-emerald-500/20"}`} />

        {/* Khung Video thời gian thực (WebRTC Video & Remote Feed) */}
        {callStatus === "connected" && (isVideo || hasRemoteStream) ? (
          <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
            {/* Luồng Video từ máy đối phương (Remote Video WebRTC) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Fallback hiển thị Avatar nếu đối phương chưa bật camera */}
            {!hasRemoteStream && (
              <div className="absolute flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-slate-800 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">{(displayName || "N")[0].toUpperCase()}</span>
                  )}
                </div>
                <span className="font-extrabold text-lg text-white drop-shadow-md">{displayName}</span>
                <span className="text-xs text-slate-300">Đang truyền âm thanh WebRTC...</span>
              </div>
            )}

            {/* Khung Picture-in-Picture Camera Của Bạn (Local Video WebRTC) */}
            {isVideo && (
              <div className="absolute top-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-slate-800 z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted // BẮT BUỘC muted để không bị vọng âm thanh của chính mình
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-2 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-bold">
                  Bạn
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Màn hình Thoại Giọng Nói Thông Thường (Voice Call) */
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
                <span className="text-yellow-300 animate-pulse">Đang đổ chuông máy đối phương...</span>
              )}
              {callStatus === "connected" && (
                <span className="text-emerald-300">Đã kết nối trực tiếp • {formatTime(callDuration)}</span>
              )}
              {callStatus === "ended" && (
                <span className="text-rose-400">{statusMessage || "Cuộc gọi đã kết thúc"}</span>
              )}
            </div>
          </div>
        )}

        {/* Video Overlay Top Controls */}
        {callStatus === "connected" && isVideo && (
          <div className="w-full flex items-center justify-between z-10 pt-2 px-1">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-300 border border-white/10">
              WebRTC Trực Tiếp • {formatTime(callDuration)}
            </div>
            <button
              onClick={handleSwitchCamera}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90"
              title="Đổi camera trước/sau"
            >
              <SwitchCamera size={16} />
            </button>
          </div>
        )}

        {/* Reminder Prompt Card */}
        {callStatus !== "ended" && !isVideo && (
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 z-10 my-4 text-left">
            <div className={`flex items-center gap-2 mb-1.5 text-xs font-bold ${isSOS ? "text-rose-400" : "text-emerald-400"}`}>
              <MessageSquare size={15} />
              <span>{isSOS ? "CUỘC GỌI KHẨN CẤP (SOS)" : "NỘI DUNG CUỘC GỌI"}</span>
            </div>
            <p className="text-white/90 text-sm font-semibold">
              {isSOS ? "Đang kết nối ưu tiên WebRTC đến người nhà. Âm thanh và hình ảnh được truyền trực tiếp." : reminderNote}
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

        {/* Control Buttons (Mic, Video, Speaker, End Call) */}
        <div className="w-full flex items-center justify-center gap-4 pt-2 z-20">
          {/* Mute Microphone Button */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted ? "bg-rose-500 text-white shadow-lg shadow-rose-900/40" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isMuted ? "Bật micro" : "Tắt micro"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Video/Camera Button */}
          <button
            onClick={toggleVideoMode}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isVideo ? "bg-primary text-white shadow-lg shadow-blue-900/40" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isVideo ? "Tắt camera" : "Bật camera"}
          >
            {isVideo ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              !isSpeaker ? "bg-amber-500 text-white shadow-lg shadow-amber-900/40" : "bg-white/15 text-white hover:bg-white/25"
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
