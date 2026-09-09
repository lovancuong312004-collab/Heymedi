import { useState, useEffect, useRef, useCallback } from "react";
import { Home, Pill, Users, Settings, Scan, Mic } from "lucide-react";
import { cn } from "./lib/utils";
import HomeScreen from "./HomeScreen";
import MedsScreen from "./MedsScreen";
import FamilyScreen from "./FamilyScreen";
import SettingsScreen from "./SettingsScreen";
import IncomingCallModal from "./components/IncomingCallModal";
import CallModal from "./caregiver/CallModal";
import SOSModal from "./screens/SOSModal";
import ScanUnknownMedModal from "./screens/ScanUnknownMedModal";
import WakeWordOverlay from "./screens/WakeWordOverlay"; // Đã import sẵn
import { silentAudioUnlock } from "./utils/voiceAssistant";
import { recordMissedCall } from "./services/missedCallService";
import { realtimeBridge } from "./services/realtimeBridge";
import { supabase } from "./lib/supabase";
import { useSettings } from "./contexts/SettingsContext";

interface Props {
  user: any;
  onLogout: () => void;
}

type ElderlyTab = "home" | "meds" | "family" | "settings";

export default function ElderlyApp({ user, onLogout }: Props) {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<ElderlyTab>("home");

  // Realtime Pill Verification Mode 
  const [verificationMode, setVerificationMode] = useState<'photo_required' | 'simple_only' | 'both'>(() => {
    return (localStorage.getItem('heymedi_pill_verification_mode') as any) || 'both';
  });

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isGlobalSOSOpen, setIsGlobalSOSOpen] = useState(false);

  // Realtime Calling state
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerName: string;
    callerRole?: string;
    callerAvatar?: string;
    isSOS?: boolean;
  } | null>(null);

  const [activeCall, setActiveCall] = useState<{
    callId: string;
    contactName: string;
    contactRole?: string;
    contactPhone?: string;
    avatarUrl?: string;
    isSOS?: boolean;
    initialVideo?: boolean;
    isInitiator?: boolean;
  } | null>(null);


  useEffect(() => {
    // 1. Silent Audio Unlock on first touch/click
    const handleFirstInteraction = () => {
      silentAudioUnlock();
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });

    // 2. Request Location & Mic
    const permissionsAlreadyRequested = localStorage.getItem("heymedi_permissions_requested");
    if (!permissionsAlreadyRequested) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => console.log("GPS Location permission granted"),
          (err) => console.warn("GPS Location permission:", err.message),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            console.log("Microphone permission granted");
            stream.getTracks().forEach((track) => track.stop());
          })
          .catch((err) => console.warn("Microphone permission:", err.message));
      }

      localStorage.setItem("heymedi_permissions_requested", "true");
    }

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;
  const globalChannelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('sos-emergency-alerts')
      .on('broadcast', { event: 'INCOMING_CALL' }, (event) => {
        const p = event.payload;
        if (!p || p.caller_id === user?.id) return;
        if (p.target_id && p.target_id !== user?.id) return;

        if (p.is_sos) {
          setIncomingCall(null);
          const ch = globalChannelRef.current || supabase.channel('sos-emergency-alerts');
          ch.send({
            type: 'broadcast',
            event: 'CALL_ACCEPTED',
            payload: {
              call_id: p.call_id,
              accepted_by_id: user?.id,
              accepted_by_name: user?.user_metadata?.full_name || "Bác",
            }
          }).catch(() => {});

          setActiveCall({
            callId: p.call_id,
            contactName: p.caller_name || "Người thân khẩn cấp",
            contactRole: "Cuộc gọi SOS Khẩn cấp",
            avatarUrl: p.caller_avatar,
            isSOS: true,
            initialVideo: true,
            isInitiator: false,
          });
          return;
        }

        setIncomingCall({
          callId: p.call_id,
          callerName: p.caller_name || "Người thân",
          callerRole: p.caller_role || "Người chăm sóc",
          callerAvatar: p.caller_avatar,
          isSOS: p.is_sos,
        });
      })
      .on('broadcast', { event: 'CALL_ENDED' }, (event) => {
        const active = incomingCallRef.current;
        if (active && event.payload?.call_id === active.callId) {
          recordMissedCall({
            callerName: active.callerName,
            callerRole: active.callerRole,
            callerAvatar: active.callerAvatar,
            isSOS: active.isSOS,
          });
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'CALL_REJECTED' }, (event) => {
        const active = incomingCallRef.current;
        if (active && event.payload?.call_id === active.callId) {
          setIncomingCall(null);
        }
      })
      .on('broadcast', { event: 'VERIFICATION_MODE_CHANGED' }, (event) => {
        if (event.payload?.mode) {
          setVerificationMode(event.payload.mode);
          localStorage.setItem('heymedi_pill_verification_mode', event.payload.mode);
        }
      })
      .subscribe();
    globalChannelRef.current = channel;

    const unsubscribeBridge = realtimeBridge.subscribe((eventName, payload) => {
      if (eventName === 'INCOMING_CALL') {
        if (!payload || payload.caller_id === user?.id) return;
        if (payload.target_id && payload.target_id !== user?.id) return;

        if (payload.is_sos) {
          const ch = globalChannelRef.current || supabase.channel('sos-emergency-alerts');
          ch.send({
            type: 'broadcast',
            event: 'CALL_ACCEPTED',
            payload: {
              call_id: payload.call_id,
              accepted_by_id: user?.id,
              accepted_by_name: user?.user_metadata?.full_name || "Bác",
            }
          }).catch(() => {});

          setActiveCall({
            callId: payload.call_id,
            contactName: payload.caller_name || "Người thân khẩn cấp",
            contactRole: "Cuộc gọi SOS Khẩn cấp",
            avatarUrl: payload.caller_avatar,
            isSOS: true,
            initialVideo: true,
            isInitiator: false,
          });
          return;
        }

        setIncomingCall({
          callId: payload.call_id,
          callerName: payload.caller_name || "Người thân",
          callerRole: payload.caller_role || "Người chăm sóc",
          callerAvatar: payload.caller_avatar,
          isSOS: payload.is_sos,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      globalChannelRef.current = null;
      unsubscribeBridge();
    };
  }, [user?.id]);

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    const channel = globalChannelRef.current || supabase.channel('sos-emergency-alerts');
    channel.send({
      type: 'broadcast',
      event: 'CALL_ACCEPTED',
      payload: {
        call_id: incomingCall.callId,
        accepted_by_id: user?.id,
        accepted_by_name: user?.user_metadata?.full_name || "Bác",
      }
    }).catch(() => {});

    setActiveCall({
      callId: incomingCall.callId,
      contactName: incomingCall.callerName,
      contactRole: incomingCall.callerRole,
      avatarUrl: incomingCall.callerAvatar,
      isSOS: incomingCall.isSOS,
      initialVideo: true,
      isInitiator: false,
    });
    setIncomingCall(null);
  };

  const handleDeclineCall = () => {
    if (!incomingCall) return;
    const channel = globalChannelRef.current || supabase.channel('sos-emergency-alerts');
    channel.send({
      type: 'broadcast',
      event: 'CALL_REJECTED',
      payload: {
        call_id: incomingCall.callId,
        rejected_by_id: user?.id
      }
    }).catch(() => {});
    recordMissedCall({
      callerName: incomingCall.callerName,
      callerRole: incomingCall.callerRole,
      callerAvatar: incomingCall.callerAvatar,
      isSOS: incomingCall.isSOS,
    });
    setIncomingCall(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-[#F4F7FB]">
      
      {/* Modal SOS */}
      <SOSModal 
        isOpen={isGlobalSOSOpen} 
        onClose={() => setIsGlobalSOSOpen(false)} 
        contactName="Người thân" 
        patientId={user?.id}
        patientName={user?.user_metadata?.full_name || "Bác"}
      />

      {/* Modal Quét Mã QR */}
      <ScanUnknownMedModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        user={user}
      />

      {/* Modal Cuộc gọi đến */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={!!incomingCall}
          callerName={incomingCall.callerName}
          callerRole={incomingCall.callerRole}
          callerAvatar={incomingCall.callerAvatar}
          isSOS={incomingCall.isSOS}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Modal Đang thoại */}
      {activeCall && (
        <CallModal
          isOpen={!!activeCall}
          onClose={() => setActiveCall(null)}
          currentUser={user}
          callId={activeCall.callId}
          contactName={activeCall.contactName}
          contactRole={activeCall.contactRole}
          contactPhone={activeCall.contactPhone}
          avatarUrl={activeCall.avatarUrl}
          isSOS={activeCall.isSOS}
          initialVideo={activeCall.initialVideo}
          isInitiator={activeCall.isInitiator}
        />
      )}

      {/* CHÍNH LÀ NÓ ĐÂY: Trợ lý AI sóng âm hoàn toàn tự động */}
      <WakeWordOverlay />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-6 min-h-0 overscroll-contain">
        {activeTab === "home" && (
          <HomeScreen 
            user={user} 
            onLogout={onLogout}
            verificationMode={verificationMode}
          />
        )}
        {activeTab === "meds" && <MedsScreen user={user} />}
        {activeTab === "family" && <FamilyScreen user={user} />}
        {activeTab === "settings" && <SettingsScreen user={user} onLogout={onLogout} />}
      </div>

      {/* Bottom Navigation */}
      <div className="shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-2 py-2 flex flex-row justify-around items-center rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40 relative">
        <NavItem icon={<Home size={22} />} label={t("nav.home")} isActive={activeTab === "home"} onClick={() => setActiveTab("home")} />
        <NavItem icon={<Pill size={22} />} label={t("nav.meds")} isActive={activeTab === "meds"} onClick={() => setActiveTab("meds")} />
        
        {/* Nút Quét QR To */}
        <button
          onClick={() => setIsScanModalOpen(true)}
          className="flex flex-col items-center justify-center -mt-6 cursor-pointer group active:scale-95 transition-transform"
          title="Quét mã QR & Nhận diện thuốc"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 border-4 border-white group-hover:scale-105 transition-transform">
            <Scan size={26} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-extrabold text-primary mt-1">
            Quét QR
          </span>
        </button>

        <NavItem icon={<Users size={22} />} label={t("nav.family")} isActive={activeTab === "family"} onClick={() => setActiveTab("family")} />
        <NavItem icon={<Settings size={22} />} label={t("nav.settings")} isActive={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center py-1 px-0.5 transition-all cursor-pointer select-none", isActive ? "text-primary" : "text-gray-400 hover:text-gray-600")}>
      <div className={cn("transition-transform duration-200", isActive && "scale-110")}>{icon}</div>
      <span className={cn("text-[10.5px] mt-1 leading-tight text-center whitespace-nowrap font-semibold", isActive ? "text-primary font-bold" : "text-gray-500")}>
        {label}
      </span>
    </button>
  );
}
