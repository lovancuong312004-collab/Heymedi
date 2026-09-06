import { useState } from "react";
import { 
  Home, 
  Pill, 
  Bell, 
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
import ScanPrescriptionModal from "./caregiver/ScanPrescriptionModal";
import AddMedModal from "./caregiver/AddMedModal";
import { FamilyProvider, useFamily } from "./contexts/FamilyContext";

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
  const { patientInfo } = useFamily();
  const patientName = patientInfo?.name || "Người bệnh";
  const patientPhone = patientInfo?.phone || "0901 234 567";

  const [activeTab, setActiveTab] = useState<CaregiverTab>("dashboard");
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);

  return (
    <div className="w-full flex flex-col min-h-screen relative bg-[#F4F7FB] font-sans">
      
      {/* Modals */}
      <CallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        patientName={patientName}
        patientPhone={patientPhone}
        reminderNote="Gọi nhắc uống thuốc"
      />

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
      <div className="flex-1 overflow-y-auto min-h-0 pb-24">
        {activeTab === "dashboard" && (
          <CaregiverDashboard
            user={user}
            onOpenCall={() => setIsCallOpen(true)}
            onOpenScan={() => setIsScanOpen(true)}
            onOpenAddMed={() => setIsAddMedOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}
        {activeTab === "meds" && (
          <CaregiverMedsScreen
            onOpenCall={() => setIsCallOpen(true)}
            onOpenScan={() => setIsScanOpen(true)}
            onOpenAddMed={() => setIsAddMedOpen(true)}
          />
        )}
        {activeTab === "family" && <CaregiverFamilyScreen user={user} />}
        {activeTab === "notifications" && (
          <NotificationsScreen
            onOpenCall={() => setIsCallOpen(true)}
          />
        )}
        {activeTab === "reports" && <AIReportScreen />}
        {activeTab === "settings" && <CaregiverSettings user={user} onLogout={onLogout} />}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 px-1 py-2 flex flex-row justify-around items-center rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        <CaregiverNavItem
          icon={<Home size={22} />}
          label="Trang chủ"
          isActive={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        />
        <CaregiverNavItem
          icon={<Pill size={22} />}
          label="Lịch thuốc"
          isActive={activeTab === "meds"}
          onClick={() => setActiveTab("meds")}
        />
        <CaregiverNavItem
          icon={<Users size={22} />}
          label="Gia đình"
          isActive={activeTab === "family"}
          onClick={() => setActiveTab("family")}
        />
        <CaregiverNavItem
          icon={<Bell size={22} />}
          label="Thông báo"
          isActive={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          badgeCount={1}
        />
        <CaregiverNavItem
          icon={<BarChart3 size={22} />}
          label="Báo cáo"
          isActive={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
        <CaregiverNavItem
          icon={<Settings size={22} />}
          label="Cài đặt"
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
