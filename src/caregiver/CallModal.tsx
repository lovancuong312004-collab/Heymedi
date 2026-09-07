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
import { cn } from "../lib/utils";

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
  isInitiator?: boolean; // true: Người gọi đi, false: Người nhận cuộc gọi
  // Legacy aliases
  patientName?: string;
  patientPhone?: string;
  reminderNote?: string;
}

// Cấu hình STUN + TURN OpenRelay đảm bảo WebRTC xuyên NAT, 4G, 5G và Wi-Fi
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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
  
  // Real Hardware Media Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideo, setIsVideo] = useState(isSOS ? true : initialVideo);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  // Remote Peer States
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [remoteIsVideo, setRemoteIsVideo] = useState(true);
  const [remoteIsMuted, setRemoteIsMuted] = useState(false);
  const [aiVoiceActive, setAiVoiceActive] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  // WebRTC & Media Element Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionChannelRef = useRef<any>(null);
  const globalChannelRef = useRef<any>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSyncIntervalRef = useRef<any>(null);
  const answerSyncIntervalRef = useRef<any>(null);
  const ringIntervalRef = useRef<any>(null);
  const callTimeoutRef = useRef<any>(null);

  // Dọn dẹp media và giải phóng tài nguyên
  const cleanupMedia = () => {
    if (offerSyncIntervalRef.current) clearInterval(offerSyncIntervalRef.current);
    if (answerSyncIntervalRef.current) clearInterval(answerSyncIntervalRef.current);
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

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
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    remoteStreamRef.current = null;

    if (sessionChannelRef.current) {
      supabase.removeChannel(sessionChannelRef.current);
      sessionChannelRef.current = null;
    }
    if (globalChannelRef.current) {
      supabase.removeChannel(globalChannelRef.current);
      globalChannelRef.current = null;
    }

    iceCandidatesQueueRef.current = [];
    setHasRemoteStream(false);
  };

  // Khởi động Camera và Micro thực tế
  const getLocalMedia = async (mode: "user" | "environment" = facingMode, wantVideo: boolean = isVideo) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: wantVideo ? { facingMode: mode } : false,
          audio: true
        });
      } catch (vidErr) {
        console.warn("[Media] Video unavailable, fallback to audio only:", vidErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        setIsVideo(false);
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.muted = true;
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn("[Media] Could not access media devices:", err);
      return null;
    }
  };

  // Gửi SDP Offer định kỳ cho đến khi có Answer
  const createAndBroadcastOffer = async (pc: RTCPeerConnection, channel: any, currentId: string) => {
    try {
      if (pc.signalingState === 'stable') {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
      }

      const sendOffer = () => {
        if (pcRef.current?.connectionState === 'connected' || pcRef.current?.remoteDescription) {
          if (offerSyncIntervalRef.current) clearInterval(offerSyncIntervalRef.current);
          return;
        }
        const activeChannel = channel || sessionChannelRef.current;
        if (pcRef.current?.localDescription && activeChannel) {
          activeChannel.send({
            type: 'broadcast',
            event: 'WEBRTC_OFFER',
            payload: { call_id: currentId, sdp: pcRef.current.localDescription }
          }).catch(() => {});
        }
      };

      sendOffer();
      if (offerSyncIntervalRef.current) clearInterval(offerSyncIntervalRef.current);
      offerSyncIntervalRef.current = setInterval(sendOffer, 1000);
    } catch (err) {
      console.error("[WebRTC] createAndBroadcastOffer error:", err);
    }
  };

  // Vòng đời chính của WebRTC Session
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

    let isMounted = true;

    const startCallWorkflow = async () => {
      // 1. Lấy camera và microphone local
      const stream = await getLocalMedia(facingMode, isVideo);
      if (!isMounted) return;

      // 2. Khởi tạo RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Đưa local tracks vào PeerConnection
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      // Xử lý luồng Media từ đối phương truyền sang
      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack received:", event.track.kind, event.streams);
        let remoteStream = event.streams && event.streams[0];
        if (!remoteStream) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          remoteStreamRef.current.addTrack(event.track);
          remoteStream = remoteStreamRef.current;
        } else {
          remoteStreamRef.current = remoteStream;
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => {
            console.warn("Video play err:", e);
            if (e.name === "NotAllowedError") setIsAudioBlocked(true);
          });
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(e => {
            console.warn("Audio play err:", e);
            if (e.name === "NotAllowedError") setIsAudioBlocked(true);
          });
        }
        setHasRemoteStream(true);
      };

      // Xử lý và gửi ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && sessionChannelRef.current) {
          sessionChannelRef.current.send({
            type: 'broadcast',
            event: 'WEBRTC_ICE',
            payload: { call_id: currentId, candidate: event.candidate }
          }).catch(() => {});
        }
      };

      // Theo dõi trạng thái kết nối WebRTC
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state changed:", pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus("connected");
          setStatusMessage("");
          if (offerSyncIntervalRef.current) clearInterval(offerSyncIntervalRef.current);
          if (answerSyncIntervalRef.current) clearInterval(answerSyncIntervalRef.current);
          if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
        }
      };

      // 3. Kết nối Kênh Signaling chuyên dụng cho phiên gọi này
      const sessionChannel = supabase.channel(`call-session-${currentId}`, {
        config: { broadcast: { self: false } }
      });
      sessionChannelRef.current = sessionChannel;

      // Đồng thời kết nối kênh toàn cục để nghe sự kiện chấp nhận/từ chối
      const globalChannel = supabase.channel('sos-emergency-alerts');
      globalChannelRef.current = globalChannel;

      const handleCallAccepted = async (payload: any) => {
        if (payload?.call_id !== currentId) return;
        console.log("[WebRTC] Call Accepted signal received:", payload);
        if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
        if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
        setCallStatus("connected");

        if (isInitiator && pcRef.current) {
          await createAndBroadcastOffer(pcRef.current, sessionChannel, currentId);
        }
      };

      const handleRemoteOffer = async (payload: any) => {
        if (payload?.call_id !== currentId || !payload?.sdp) return;
        const pc = pcRef.current;
        if (!pc) return;

        if (!pc.remoteDescription) {
          console.log("[WebRTC] Setting Remote Description (Offer)");
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            // Xả các ICE candidates đã được nhận trước đó
            while (iceCandidatesQueueRef.current.length > 0) {
              const c = iceCandidatesQueueRef.current.shift();
              if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }

            // Tạo Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Gửi Answer ngay lập tức
            sessionChannel.send({
              type: 'broadcast',
              event: 'WEBRTC_ANSWER',
              payload: { call_id: currentId, sdp: answer }
            }).catch(() => {});

            // Lặp lại gửi Answer mỗi giây cho đến khi kết nối thành công hoặc nhận được ACK
            if (answerSyncIntervalRef.current) clearInterval(answerSyncIntervalRef.current);
            answerSyncIntervalRef.current = setInterval(() => {
              if (pcRef.current?.connectionState === 'connected') {
                clearInterval(answerSyncIntervalRef.current);
                return;
              }
              if (pcRef.current?.localDescription && sessionChannelRef.current) {
                sessionChannelRef.current.send({
                  type: 'broadcast',
                  event: 'WEBRTC_ANSWER',
                  payload: { call_id: currentId, sdp: pcRef.current.localDescription }
                }).catch(() => {});
              }
            }, 1000);
          } catch (err) {
            console.error("[WebRTC] Error handling remote offer:", err);
          }
        }
      };

      const handleRemoteAnswer = async (payload: any) => {
        if (payload?.call_id !== currentId || !payload?.sdp) return;
        const pc = pcRef.current;
        if (!pc) return;

        if (pc.signalingState === 'have-local-offer') {
          console.log("[WebRTC] Setting Remote Description (Answer)");
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            // Xả các ICE candidates
            while (iceCandidatesQueueRef.current.length > 0) {
              const c = iceCandidatesQueueRef.current.shift();
              if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }

            // Dừng gửi offer
            if (offerSyncIntervalRef.current) clearInterval(offerSyncIntervalRef.current);

            // Gửi ACK báo đã nhận Answer
            sessionChannel.send({
              type: 'broadcast',
              event: 'WEBRTC_ACK',
              payload: { call_id: currentId }
            }).catch(() => {});

            setCallStatus("connected");
          } catch (err) {
            console.error("[WebRTC] Error setting remote answer:", err);
          }
        }
      };

      const handleRemoteIce = async (payload: any) => {
        if (payload?.call_id !== currentId || !payload?.candidate) return;
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
        } else {
          iceCandidatesQueueRef.current.push(payload.candidate);
        }
      };

      const handleMediaState = (payload: any) => {
        if (typeof payload?.isVideo === 'boolean') setRemoteIsVideo(payload.isVideo);
        if (typeof payload?.isMuted === 'boolean') setRemoteIsMuted(payload.isMuted);
      };

      const handleCallTerminated = () => {
        setCallStatus("ended");
        setStatusMessage("Đối phương đã cúp máy");
        setTimeout(() => onClose(), 1200);
      };

      // Đăng ký nhận sự kiện trên Kênh Session
      sessionChannel
        .on('broadcast', { event: 'CALL_ACCEPTED' }, (ev) => handleCallAccepted(ev.payload))
        .on('broadcast', { event: 'WEBRTC_OFFER' }, (ev) => handleRemoteOffer(ev.payload))
        .on('broadcast', { event: 'WEBRTC_ANSWER' }, (ev) => handleRemoteAnswer(ev.payload))
        .on('broadcast', { event: 'WEBRTC_ACK' }, () => {
          if (answerSyncIntervalRef.current) clearInterval(answerSyncIntervalRef.current);
          setCallStatus("connected");
        })
        .on('broadcast', { event: 'WEBRTC_ICE' }, (ev) => handleRemoteIce(ev.payload))
        .on('broadcast', { event: 'MEDIA_STATE' }, (ev) => handleMediaState(ev.payload))
        .on('broadcast', { event: 'CALL_ENDED' }, handleCallTerminated)
        .on('broadcast', { event: 'CALL_REJECTED' }, () => {
          setCallStatus("ended");
          setStatusMessage("Người nhận bận (Cuộc gọi bị từ chối)");
          setTimeout(() => onClose(), 1800);
        });

      // Đăng ký nhận sự kiện trên Kênh Toàn cục (Backup)
      globalChannel
        .on('broadcast', { event: 'CALL_ACCEPTED' }, (ev) => handleCallAccepted(ev.payload))
        .on('broadcast', { event: 'CALL_REJECTED' }, (ev) => {
          if (ev.payload?.call_id === currentId) {
            setCallStatus("ended");
            setStatusMessage("Người nhận bận (Cuộc gọi bị từ chối)");
            setTimeout(() => onClose(), 1800);
          }
        })
        .on('broadcast', { event: 'CALL_ENDED' }, (ev) => {
          if (ev.payload?.call_id === currentId) {
            handleCallTerminated();
          }
        });

      // Kích hoạt lắng nghe trên Session Channel
      sessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isMounted) {
          console.log("[WebRTC] Session channel joined successfully:", currentId);

          if (!isInitiator) {
            // Callee: Phát tín hiệu CALL_ACCEPTED trên session channel
            sessionChannel.send({
              type: 'broadcast',
              event: 'CALL_ACCEPTED',
              payload: {
                call_id: currentId,
                accepted_by_id: currentUser?.id,
                accepted_by_name: currentUser?.user_metadata?.full_name || "Đối phương"
              }
            }).catch(() => {});
          } else {
            // Caller: Khởi tạo offer ban đầu
            if (pcRef.current) {
              await createAndBroadcastOffer(pcRef.current, sessionChannel, currentId);
            }
          }
        }
      });

      // Thiết lập Caller: Đổ chuông và phát tín hiệu INCOMING_CALL
      if (isInitiator) {
        setCallStatus("ringing");

        const sendIncomingCall = () => {
          const callerName = currentUser?.user_metadata?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : "Người thân");
          const payload = {
            call_id: currentId,
            caller_id: currentUser?.id,
            caller_name: callerName,
            caller_role: currentUser?.user_metadata?.role || "Gia đình",
            caller_avatar: currentUser?.user_metadata?.avatar_url,
            target_id: targetId,
            is_sos: isSOS,
            initial_video: isVideo,
            timestamp: new Date().toISOString()
          };

          globalChannel.send({
            type: 'broadcast',
            event: 'INCOMING_CALL',
            payload
          }).catch(() => {});

          sessionChannel.send({
            type: 'broadcast',
            event: 'INCOMING_CALL',
            payload
          }).catch(() => {});
        };

        sendIncomingCall();
        ringIntervalRef.current = setInterval(sendIncomingCall, 2000);

        // Hết 35 giây không nghe máy -> Tự ngắt
        callTimeoutRef.current = setTimeout(() => {
          if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
          if (offerSyncIntervalRef.current) clearInterval(offerSyncIntervalRef.current);
          setCallStatus("ended");
          setStatusMessage("Người nhận không trả lời (Đã ghi nhận cuộc gọi nhỡ)");
          setTimeout(() => onClose(), 1500);
        }, 35000);
      } else {
        setCallStatus("connected");
      }
    };

    startCallWorkflow();

    return () => {
      isMounted = false;
      cleanupMedia();
    };
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

  // Bắn trạng thái Media sang đối phương
  const broadcastMediaState = (state: { isMuted: boolean; isVideo: boolean }) => {
    if (sessionChannelRef.current) {
      sessionChannelRef.current.send({
        type: 'broadcast',
        event: 'MEDIA_STATE',
        payload: state
      }).catch(() => {});
    }
  };

  // Bật/Tắt Micro thực tế (Mute/Unmute Audio Track)
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
    }
    if (pcRef.current) {
      pcRef.current.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !next;
        }
      });
    }
    broadcastMediaState({ isMuted: next, isVideo });
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
    if (pcRef.current) {
      pcRef.current.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = next;
        }
      });
    }
    broadcastMediaState({ isVideo: next, isMuted });
  };

  // Bật/Tắt Loa ngoài thực tế (Mute Remote Audio & Video)
  const toggleSpeaker = () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !next;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !next;
    }
  };

  // Chuyển đổi Camera trước / sau
  const handleSwitchCamera = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: true
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack && pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.warn("Could not switch camera:", err);
    }
  };

  // Cúp máy kết thúc cuộc gọi
  const handleEndCall = () => {
    setCallStatus("ended");
    setStatusMessage("Cuộc gọi đã kết thúc");

    if (sessionChannelRef.current) {
      sessionChannelRef.current.send({
        type: 'broadcast',
        event: 'CALL_ENDED',
        payload: { call_id: activeCallId, ended_by_id: currentUser?.id }
      }).catch(() => {});
    }
    if (globalChannelRef.current) {
      globalChannelRef.current.send({
        type: 'broadcast',
        event: 'CALL_ENDED',
        payload: { call_id: activeCallId, ended_by_id: currentUser?.id }
      }).catch(() => {});
    }

    cleanupMedia();
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleModalInteraction = () => {
    if (isAudioBlocked) {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().then(() => setIsAudioBlocked(false)).catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.play().then(() => setIsAudioBlocked(false)).catch(() => {});
      }
    }
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  const showVideoOverlay = callStatus === "connected" && isVideo;

  return (
    <div 
      onClick={handleModalInteraction}
      onTouchStart={handleModalInteraction}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white rounded-[36px] p-5 flex flex-col items-center justify-between min-h-[580px] shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className={`absolute top-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isSOS ? "bg-rose-500/30" : "bg-emerald-500/20"}`} />

        {/* Nút mở tiếng nếu Safari iOS chặn Autoplay Audio */}
        {isAudioBlocked && (
          <div className="absolute top-4 z-40 px-4 w-full flex justify-center animate-bounce">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (remoteAudioRef.current) remoteAudioRef.current.play();
                if (remoteVideoRef.current) remoteVideoRef.current.play();
                setIsAudioBlocked(false);
              }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black py-2.5 px-4 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer border border-amber-500"
            >
              <Volume2 size={16} />
              <span>Bấm vào đây để mở tiếng (Safari)</span>
            </button>
          </div>
        )}

        {/* Remote Audio Track Player (Đảm bảo âm thanh đàm thoại 100% không bao giờ bị ngắt) */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          muted={!isSpeaker}
          className="hidden"
        />

        {/* 1. KHUNG REMOTE VIDEO WEBRTC (LUÔN TỒN TẠI TRONG DOM ĐỂ HIỂN THỊ HÌNH ẢNH) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={!isSpeaker}
          className={cn(
            "absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300",
            showVideoOverlay && hasRemoteStream && remoteIsVideo ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />

        {/* 2. KHUNG LOCAL VIDEO WEBRTC (PICTURE-IN-PICTURE, BẮT BUỘC MUTED ĐỂ KHÔNG HÚ MIC) */}
        <div className={cn(
          "absolute top-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-slate-800 z-20 transition-all",
          callStatus === "connected" && isVideo ? "block" : "hidden"
        )}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // KHÔNG BAO GIỜ BỎ MUTED TRÊN LOCAL VIDEO
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 left-2 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-bold">
            Bạn {!isMuted ? "🎤" : "🔇"}
          </span>
        </div>

        {/* 3. GIAO DIỆN AVATAR (KHI ĐANG ĐỔ CHUÔNG HOẶC CHẾ ĐỘ THOẠI KHÔNG CAM) */}
        {(!showVideoOverlay || !hasRemoteStream || !remoteIsVideo) && (
          <div className="flex flex-col items-center gap-3 pt-6 z-10 text-center w-full">
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
                <span className="text-emerald-300">
                  WebRTC Trực Tiếp • {formatTime(callDuration)}
                </span>
              )}
              {callStatus === "ended" && (
                <span className="text-rose-400">{statusMessage || "Cuộc gọi đã kết thúc"}</span>
              )}
            </div>

            {callStatus === "connected" && (
              <div className="flex items-center gap-2">
                {hasRemoteStream ? (
                  <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    🟢 Âm thanh & Hình ảnh đã đồng bộ
                  </span>
                ) : (
                  <span className="text-xs text-yellow-300 bg-yellow-950/60 px-2.5 py-0.5 rounded-full border border-yellow-500/30 animate-pulse">
                    🟡 Đang thiết lập WebRTC P2P...
                  </span>
                )}
              </div>
            )}

            {remoteIsMuted && callStatus === "connected" && (
              <span className="text-[11px] text-amber-300 bg-black/40 px-3 py-1 rounded-full border border-amber-300/30 animate-pulse">
                Đối phương đang tắt micro
              </span>
            )}
          </div>
        )}

        {/* Video Overlay Top Controls (Khi cả hai đang xem video) */}
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
        {callStatus !== "ended" && (!isVideo || !hasRemoteStream) && (
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
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer",
              isMuted ? "bg-rose-500 text-white shadow-lg shadow-rose-900/40" : "bg-white/15 text-white hover:bg-white/25"
            )}
            title={isMuted ? "Bật micro" : "Tắt micro"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Video/Camera Button */}
          <button
            onClick={toggleVideoMode}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer",
              isVideo ? "bg-primary text-white shadow-lg shadow-blue-900/40" : "bg-white/15 text-white hover:bg-white/25"
            )}
            title={isVideo ? "Tắt camera" : "Bật camera"}
          >
            {isVideo ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={toggleSpeaker}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer",
              !isSpeaker ? "bg-amber-500 text-white shadow-lg shadow-amber-900/40" : "bg-white/15 text-white hover:bg-white/25"
            )}
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
