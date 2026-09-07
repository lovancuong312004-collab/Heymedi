import { useState } from "react";
import { Home, Pill, Users, Settings, Volume2, Sparkles, Hand } from "lucide-react";
import { cn } from "./lib/utils";
import HomeScreen from "./HomeScreen";
import MedsScreen from "./MedsScreen";
import FamilyScreen from "./FamilyScreen";
import SettingsScreen from "./SettingsScreen";
import { unlockAudio } from "./utils/voiceAssistant";

interface Props {
  user: any;
  onLogout: () => void;
}

type ElderlyTab = "home" | "meds" | "family" | "settings";

export default function ElderlyApp({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ElderlyTab>("home");
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const patientName = user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "Bác");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const handleUnlockAudio = () => {
    try {
      unlockAudio();
    } catch (e) {
      console.warn("Unlock audio warning:", e);
    }
    setIsAudioUnlocked(true);
  };

  return (
    <div className="w-full flex flex-col min-h-screen relative bg-[#F4F7FB]">
      {/* Full-screen Welcome & Audio Unlock Overlay */}
      {!isAudioUnlocked && (
        <div 
          onClick={handleUnlockAudio}
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#1A56DB] via-[#1E429F] to-[#0F172A] text-white flex flex-col items-center justify-between p-6 sm:p-10 text-center cursor-pointer select-none animate-fade-in"
        >
          {/* Top badge */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mt-4">
            <Sparkles size={16} className="text-amber-300" />
            <span className="text-xs font-bold tracking-wider uppercase">Trợ lý Nhắc thuốc Heymedi</span>
          </div>

          {/* Main Greeting & Visual */}
          <div className="flex flex-col items-center max-w-sm w-full gap-6">
            <div className="space-y-2">
              <p className="text-blue-200 text-lg font-medium">{getGreeting()},</p>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {patientName} 👋
              </h1>
            </div>

            {/* Pulse Voice Visual Icon */}
            <div className="relative my-4 flex items-center justify-center">
              <span className="absolute w-36 h-36 rounded-full bg-blue-400/20 animate-ping" />
              <span className="absolute w-28 h-28 rounded-full bg-white/20 animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-white text-primary flex items-center justify-center shadow-2xl shadow-blue-900/50 relative z-10">
                <Volume2 size={44} className="text-primary animate-bounce" />
              </div>
            </div>

            {/* Call to action */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 px-5 py-2.5 rounded-full font-extrabold text-base shadow-lg animate-pulse">
                <Hand size={20} />
                <span>Nhấn vào màn hình để bắt đầu</span>
              </div>
              <p className="text-blue-100 text-sm leading-relaxed px-4">
                Chạm vào bất cứ đâu để kích hoạt giọng nói nhắc nhở tự động khi đến giờ uống thuốc.
              </p>
            </div>
          </div>

          {/* Bottom hint button */}
          <div className="w-full max-w-xs mb-4">
            <button 
              onClick={handleUnlockAudio}
              className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-3.5 rounded-2xl backdrop-blur-md transition-all active:scale-95 shadow-lg text-sm uppercase tracking-wide"
            >
              Chạm để vào ứng dụng
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 min-h-0">
        {activeTab === "home" && (
          <HomeScreen 
            user={user} 
            onLogout={onLogout} 
            isAudioUnlocked={isAudioUnlocked} 
          />
        )}
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
