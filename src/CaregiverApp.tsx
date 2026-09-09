import { useState, useEffect, useRef } from "react";
import { 
  Home, 
  Pill, 
  BarChart3, 
  Settings,
  Users
} from "lucide-react";
import { cn } from "./lib/utils";

import CaregiverDashboard from "./caregiver/CaregiverDashboard";
import CaregiverMedsScreen from "./caregiver/CaregiverMedsScreen";
import NotificationsScreen from "./caregiver/NotificationsScreen";
import AIReportScreen from "./caregiver/AIReportScreen";
import CaregiverSettings from "./caregiver/CaregiverSettings";
import CaregiverFamilyScreen from "./caregiver/CaregiverFamilyScreen";
import CallModal from "./caregiver/CallModal";
import IncomingCallModal from "./components/IncomingCallModal";
import CaregiverSOSAlertModal, { type SOSAlertPayload } from "./caregiver/CaregiverSOSAlertModal";
import PillProofReceivedModal, { type PillProofPayload } from "./components/PillProofReceivedModal";
import ScanPrescriptionModal from "./caregiver/ScanPrescriptionModal";
import AddMedModal from "./caregiver/AddMedModal";
import { FamilyProvider, useFamily } from "./contexts/FamilyContext";
import { recordMissedCall, getUnreadMissedCallCount } from "./services/missedCallService";
import { savePillProof } from "./services/medicationService";
import { recordSosAlert } from "./services/emergencySosService";
import { realtimeBridge } from "./services/realtimeBridge";
import { supabase } from "./lib/supabase";
import { useSettings } from "./contexts/SettingsContext";

interface Props {
  user: any;
  onLogout: () => void;
}

type CaregiverTab = "dashboard" | "meds" | "family" | "notifications" | "reports" | "settings";

export default function CaregiverApp({ user, onLogout }: Props) {
  return (
    <FamilyProvider>
      <CaregiverAppContent user={user} onLogout={onLogout} />
    </FamilyProvider>
  );
}

function CaregiverAppContent({ user, onLogout }: Props) {
  const { t } = useSettings();
  const { linkedPatientId, patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Người bệnh");
  const patientPhone = patientInfo?.phone || "0901 234 567";

  const [activeTab, setActiveTab] = useState<CaregiverTab>("dashboard");
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [sosAlert, setSosAlert] = useState<SOSAlertPayload | null>(null);
  const [pillProofAlert, setPillProofAlert] = useState<PillProofPayload | null>(null);
  const [unreadMissedCount, setUnreadMissedCount] = useState<number>(getUnreadMissedCallCount());

  useEffect(() => {
    const handleMissedUpdated = () => {
      setUnreadMissedCount(getUnreadMissedCallCount());
    };
    window.addEventListener('heymedi_missed_calls_changed', handleMissedUpdated);
    return () => {
      window.removeEventListener('heymedi_missed_calls_changed', handleMissedUpdated);
    };
  }, []);

  // Cuộc gọi đến và Cuộc gọi đang hoạt động
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

  const handleStartCall = (options?: { isSOS?: boolean; video?: boolean }) => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveCall({
      callId,
      contactName: patientName,
      contactPhone: patientPhone,
      contactRole: "Người bệnh",
      avatarUrl: patientInfo?.avatar_url,
      isSOS: options?.isSOS || false,
      initialVideo: options?.video || false,
      isInitiator: true,
    });
  };

  const globalChannelRef = useRef<any>(null);

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    const channel = globalChannelRef.current || supabase.channel('sos-emergency-alerts');
    channel.send({
      type: 'broadcast',
      event: 'CALL_ACCEPTED',
      payload: {
        call_id: incomingCall.callId,
        accepted_by_id: user?.id,
        accepted_by_name: user?.user_metadata?.full_name || "Người chăm sóc",
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

  const handleDeclineIncomingCall = () => {
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

  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;

  // Global Emergency SOS & Medication Proof & Incoming Call Listener
  useEffect(() => {
    const handleEmergencyPayload = (payload: SOSAlertPayload) => {
      if (!payload) return;
      // Lưu vĩnh viễn vào danh sách thông báo SOS để người chăm sóc xem lại mọi lúc
      recordSosAlert(payload);

      // Khớp đúng người bệnh hoặc chưa liên kết hoặc payload chưa có ID
      if (!linkedPatientId || payload.patient_id === linkedPatientId || !payload.patient_id || payload.patient_id === "patient_unknown") {
        setPillProofAlert(null); // Tránh chồng đè modal minh chứng thuốc phía dưới
        setSosAlert(payload);
      }
    };

    const channel = supabase.channel('sos-emergency-alerts')
      .on('broadcast', { event: 'EMERGENCY' }, (event) => {
        console.log("Global Caregiver received SOS Broadcast:", event);
        handleEmergencyPayload(event.payload as SOSAlertPayload);
      })
      .on('broadcast', { event: 'INCOMING_CALL' }, (event) => {
        console.log("Caregiver received INCOMING_CALL:", event);
        const p = event.payload;
        if (!p || p.caller_id === user?.id) return;
        if (p.target_id && p.target_id !== user?.id) return;
        if (!p.target_id && linkedPatientId && p.caller_id !== linkedPatientId) return;

        setIncomingCall({
          callId: p.call_id,
          callerName: p.caller_name || patientName,
          callerRole: p.caller_role || "Người bệnh",
          callerAvatar: p.caller_avatar || patientInfo?.avatar_url,
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
      .on('broadcast', { event: 'UNKNOWN_MED_TAKEN' }, (event) => {
        console.log("Caregiver received UNKNOWN_MED_TAKEN:", event);
        const p = event.payload;
        if (p && (!linkedPatientId || p.patient_id === linkedPatientId)) {
          alert(`🔔 THÔNG BÁO TỪ NGƯỜI BỆNH:\n${p.patient_name || patientName} vừa quét và tự uống thuốc: "${p.med_name}".\nMức độ an toàn: ${p.safety_level === 'safe' ? 'An toàn' : p.safety_level === 'warning' ? 'Cần cẩn trọng' : 'Nguy hiểm'}`);
        }
      })
      .on('broadcast', { event: 'PILL_TAKEN_PROOF' }, (event) => {
        console.log("Caregiver received PILL_TAKEN_PROOF:", event);
        const p = event.payload;
        if (p && (!linkedPatientId || !p.patient_id || p.patient_id === linkedPatientId)) {
          if (p.reminder_id && p.photo_url) {
            savePillProof(p.reminder_id, p.photo_url);
          }
          setPillProofAlert({
            patient_id: p.patient_id,
            patient_name: p.patient_name || patientName,
            reminder_id: p.reminder_id,
            med_name: p.med_name || "Thuốc",
            dosage: p.dosage,
            photo_url: p.photo_url,
            scheduled_time: p.scheduled_time,
            taken_at: p.taken_at || p.timestamp,
            timestamp: p.timestamp || new Date().toISOString()
          });
        }
      })
      .subscribe();
    globalChannelRef.current = channel;

    const unsubscribeBridge = realtimeBridge.subscribe((eventName, payload) => {
      if (eventName === 'EMERGENCY') {
        handleEmergencyPayload(payload);
      } else if (eventName === 'INCOMING_CALL') {
        if (!payload || payload.caller_id === user?.id) return;
        if (payload.target_id && payload.target_id !== user?.id) return;
        if (!payload.target_id && linkedPatientId && payload.caller_id !== linkedPatientId) return;

        setIncomingCall({
          callId: payload.call_id,
          callerName: payload.caller_name || patientName,
          callerRole: payload.caller_role || "Người bệnh",
          callerAvatar: payload.caller_avatar || patientInfo?.avatar_url,
          isSOS: payload.is_sos,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      globalChannelRef.current = null;
      unsubscribeBridge();
    };
  }, [linkedPatientId, user?.id]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-[#F4F7FB] font-sans">
      
      {/* Fullscreen Siren SOS Alert Modal */}
      <CaregiverSOSAlertModal
        alertData={sosAlert}
        onDismiss={() => setSosAlert(null)}
        onOpenCall={() => {
          setSosAlert(null);
          setPillProofAlert(null);
          handleStartCall({ isSOS: true, video: true });
        }}
      />

      {/* Modal Hiển thị minh chứng uống thuốc người già gửi sang */}
      <PillProofReceivedModal
        alertData={pillProofAlert}
        onClose={() => setPillProofAlert(null)}
        onOpenCall={() => {
          setPillProofAlert(null);
          handleStartCall();
        }}
      />

      {/* Modal Cuộc gọi đến toàn cục */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={!!incomingCall}
          callerName={incomingCall.callerName}
          callerRole={incomingCall.callerRole}
          callerAvatar={incomingCall.callerAvatar}
          isSOS={incomingCall.isSOS}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Modal Đang thoại / Gọi đi hai chiều */}
      {activeCall && (
        <CallModal
          isOpen={!!activeCall}
          onClose={() => setActiveCall(null)}
          currentUser={user}
          targetId={linkedPatientId || undefined}
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

      <ScanPrescriptionModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSuccess={() => {
          setActiveTab("meds");
        }}
      />

      <AddMedModal
        isOpen={isAddMedOpen}
        onClose={() => setIsAddMedOpen(false)}
        onAdd={() => {
          alert(`Đã lưu thành công thuốc vào đơn thuốc!`);
          setActiveTab("meds");
        }}
      />

      {/* Main Tab View */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6 overscroll-contain">
        {activeTab === "dashboard" && (
          <CaregiverDashboard
            user={user}
            unreadMissedCount={unreadMissedCount}
            onOpenCall={() => handleStartCall()}
            onOpenScan={() => setIsScanOpen(true)}
            onOpenAddMed={() => setIsAddMedOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}
        {activeTab === "meds" && (
          <CaregiverMedsScreen
            onOpenCall={() => handleStartCall()}
            onOpenScan={() => setIsScanOpen(true)}
            onOpenAddMed={() => setIsAddMedOpen(true)}
          />
        )}
        {activeTab === "family" && <CaregiverFamilyScreen user={user} />}
        {activeTab === "notifications" && (
          <div className="flex flex-col h-full">
            {/* Header with back button */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setActiveTab("dashboard")}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer text-sm font-bold"
                title="Quay lại Trang chủ"
              >
                ←
              </button>
              <h2 className="text-base font-black text-[#1a2b4b]">Thông báo & Cuộc gọi</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NotificationsScreen
                onOpenCall={() => handleStartCall()}
              />
            </div>
          </div>
        )}
        {activeTab === "reports" && <AIReportScreen />}
        {activeTab === "settings" && <CaregiverSettings user={user} onLogout={onLogout} />}
      </div>

      {/* Bottom Navigation: 5 TAB CHUẨN KHÔNG BAO GIỜ BỊ ĐẨY MẤT CÀI ĐẶT */}
      <div className="shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-1 py-2 flex flex-row justify-around items-center rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        <CaregiverNavItem
          icon={<Home size={22} />}
          label={t("nav.caregiver_home")}
          isActive={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        />
        <CaregiverNavItem
          icon={<Pill size={22} />}
          label={t("nav.caregiver_meds")}
          isActive={activeTab === "meds"}
          onClick={() => setActiveTab("meds")}
        />
        <CaregiverNavItem
          icon={<Users size={22} />}
          label={t("nav.caregiver_family")}
          isActive={activeTab === "family"}
          onClick={() => setActiveTab("family")}
        />
        <CaregiverNavItem
          icon={<BarChart3 size={22} />}
          label={t("nav.caregiver_reports")}
          isActive={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
        <CaregiverNavItem
          icon={<Settings size={22} />}
          label={t("nav.caregiver_settings")}
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </div>

    </div>
  );
}

function CaregiverNavItem({
  icon,
  label,
  isActive,
  onClick,
  badgeCount
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center py-1 px-0.5 transition-all cursor-pointer select-none relative",
        isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "transition-transform duration-200",
            isActive && "scale-110"
          )}
        >
          {icon}
        </div>
        {badgeCount && badgeCount > 0 && (
          <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center shadow-sm animate-pulse">
            {badgeCount}
          </span>
        )}
      </div>

      <span
        className={cn(
          "text-[10px] sm:text-[10.5px] mt-1 leading-tight text-center whitespace-nowrap",
          isActive ? "text-primary font-bold" : "text-gray-500 font-semibold"
        )}
      >
        {label}
      </span>
    </button>
  );
}
