import { useState } from "react";
import { Home, Pill, Users, Settings } from "lucide-react";
import { cn } from "./lib/utils";
import HomeScreen from "./HomeScreen";
import MedsScreen from "./MedsScreen";
import FamilyScreen from "./FamilyScreen";
import SettingsScreen from "./SettingsScreen";

interface Props {
  user: any;
  onLogout: () => void;
}

type ElderlyTab = "home" | "meds" | "family" | "settings";

export default function ElderlyApp({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ElderlyTab>("home");

  return (
    <div className="w-full flex flex-col min-h-screen relative bg-[#F4F7FB]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 min-h-0">
        {activeTab === "home" && <HomeScreen user={user} onLogout={onLogout} />}
        {activeTab === "meds" && <MedsScreen user={user} />}
        {activeTab === "family" && <FamilyScreen user={user} />}
        {activeTab === "settings" && <SettingsScreen user={user} onLogout={onLogout} />}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 px-2 py-2 flex flex-row justify-around items-center rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        <NavItem icon={<Home size={22} />} label="Trang chủ"    isActive={activeTab === "home"}     onClick={() => setActiveTab("home")} />
        <NavItem icon={<Pill size={22} />} label="Thuốc của tôi" isActive={activeTab === "meds"}     onClick={() => setActiveTab("meds")} />
        <NavItem icon={<Users size={22} />} label="Gia đình"   isActive={activeTab === "family"}   onClick={() => setActiveTab("family")} />
        <NavItem icon={<Settings size={22} />} label="Cài đặt" isActive={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
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
