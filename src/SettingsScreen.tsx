import { useState } from "react";
import { 
  User, 
  Volume2, 
  Globe, 
  Cloud, 
  HelpCircle, 
  Info, 
  ChevronRight, 
  LogOut, 
  X, 
  Check, 
  RefreshCw, 
  Type, 
  Sparkles,
  Phone,
  Pill,
  Moon,
  Sun,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import HealthProfileModal from "./screens/HealthProfileModal";
import { useSettings, type VoiceId, type FontSize } from "./contexts/SettingsContext";
import { cn } from "./lib/utils";

interface Props {
  user: any;
  onLogout: () => void;
}

export default function SettingsScreen({ user, onLogout }: Props) {
  const meta = user?.user_metadata || {};
  const rawName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Bác");
  const displayName = rawName.toLowerCase().startsWith("bác ") ? rawName : `Bác ${rawName}`;

  const { 
    fontSize, 
    setFontSize, 
    language, 
    setLanguage, 
    voiceSettings, 
    setVoiceSettings, 
    theme,
    toggleTheme,
    t, 
    testVoice 
  } = useSettings();

  // Modals state
  const [isHealthProfileOpen, setIsHealthProfileOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "audio" | "fontSize" | "language" | "sync" | "guide" | "about" | "logout" | null
  >(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Vừa xong");
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const handleTestVoiceClick = () => {
    setIsTestingVoice(true);
    testVoice(displayName);
    setTimeout(() => {
      setIsTestingVoice(false);
    }, 2800);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString(language === 'en' ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" }));
      alert(t("sync.success"));
    }, 1200);
  };

  // Tên hiển thị giọng đọc hiện tại
  const currentVoiceLabel = {
    female_north: t("voice.female_north"),
    male_north: t("voice.male_north"),
    female_south: t("voice.female_south"),
    male_south: t("voice.male_south"),
  }[voiceSettings.voiceId] || t("voice.female_north");

  // Tên hiển thị cỡ chữ hiện tại
  const currentFontLabel = {
    normal: t("font.normal"),
    large: t("font.large"),
    xl: t("font.xl"),
  }[fontSize] || t("font.large");

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB] animate-fade-in select-none pb-24">
      {/* Header */}
      <div className="flex justify-center items-center mb-4 mt-2">
        <h1 className="text-2xl font-black text-[#1a2b4b]">{t("settings.title")}</h1>
      </div>

      {/* Profile Card */}
      <div 
        onClick={() => setIsHealthProfileOpen(true)}
        className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 mb-4 cursor-pointer hover:bg-gray-50/80 active:scale-[0.99] transition-all"
      >
        <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-black text-2xl border-2 border-white shadow-sm shrink-0">
          {meta.avatar_url ? (
            <img src={meta.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{(rawName || "B")[0].toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[#1a2b4b] font-bold text-xl leading-tight truncate">{displayName}</h2>
            <span className="text-[10px] font-bold bg-[#EBF1FF] text-primary px-2 py-0.5 rounded-full shrink-0">
              {t("settings.profile_sub")}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{meta.phone || (language === 'en' ? "Tap to edit health profile" : "Bấm để cập nhật hồ sơ & sức khỏe")}</p>
        </div>
        <ChevronRight className="text-gray-400 shrink-0" size={20} />
      </div>

      {/* Settings Menu List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-6">
        <SettingItem 
          icon={<User size={22} />} 
          label={t("settings.profile")} 
          value={t("settings.profile_sub")}
          onClick={() => setIsHealthProfileOpen(true)}
          hasBorder 
        />
        <SettingItem 
          icon={<Volume2 size={22} />} 
          label={t("settings.sound_voice")} 
          value={currentVoiceLabel}
          onClick={() => setActiveModal("audio")}
          hasBorder 
        />
        <SettingItem 
          icon={<Type size={22} />} 
          label={t("settings.font_size")} 
          value={currentFontLabel}
          onClick={() => setActiveModal("fontSize")}
          hasBorder 
        />
        {/* Chế độ ban đêm (Dark Mode) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="w-6 flex justify-center items-center text-[#1a2b4b]">
              {theme === 'dark' ? (
                <Moon size={22} className="text-amber-400 fill-amber-400" />
              ) : (
                <Sun size={22} className="text-amber-500" />
              )}
            </div>
            <div>
              <span className="text-[#1a2b4b] font-bold text-base block leading-tight">
                Chế độ ban đêm
              </span>
              <span className="text-xs text-gray-400 font-medium">Giao diện tối dịu mắt</span>
            </div>
          </div>
          <button onClick={toggleTheme} className="cursor-pointer" title="Bật/tắt giao diện tối">
            {theme === 'dark' ? (
              <ToggleRight size={36} className="text-primary fill-primary" />
            ) : (
              <ToggleLeft size={36} className="text-gray-300" />
            )}
          </button>
        </div>
        <SettingItem 
          icon={<Globe size={22} />} 
          label={t("settings.language")} 
          value={language === "vi" ? "Tiếng Việt" : "English"} 
          onClick={() => setActiveModal("language")}
          hasBorder 
        />
        <SettingItem 
          icon={<Cloud size={22} />} 
          label={t("settings.cloud_sync")} 
          value={lastSyncTime}
          onClick={() => setActiveModal("sync")}
          hasBorder 
        />
        <SettingItem 
          icon={<HelpCircle size={22} />} 
          label={t("settings.guide")} 
          onClick={() => setActiveModal("guide")}
          hasBorder 
        />
        <SettingItem 
          icon={<Info size={22} />} 
          label={t("settings.about")} 
          value="v1.0.0"
          onClick={() => setActiveModal("about")}
        />
      </div>

      {/* Logout Button */}
      <div className="mt-auto pb-4">
        <button 
          onClick={() => setActiveModal("logout")} 
          className="w-full bg-white text-danger border border-red-200 py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer"
        >
          <LogOut size={20} className="text-danger" strokeWidth={2.5} />
          <span>{t("settings.logout")}</span>
        </button>
      </div>

      {/* Health Profile Modal */}
      <HealthProfileModal 
        isOpen={isHealthProfileOpen} 
        onClose={() => setIsHealthProfileOpen(false)} 
        user={user} 
      />

      {/* 1. Audio & Voice Settings Modal */}
      {activeModal === "audio" && (
        <ModalWrapper title={t("voice.modal_title")} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* Lựa chọn giọng đọc Nam / Nữ */}
            <div>
              <label className="text-xs font-black text-[#1a2b4b] uppercase tracking-wider block mb-2">
                {t("voice.choose_voice")}
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: "female_north",
                    icon: "👩",
                    title: t("voice.female_north"),
                    desc: t("voice.female_north_desc"),
                  },
                  {
                    id: "male_north",
                    icon: "👨",
                    title: t("voice.male_north"),
                    desc: t("voice.male_north_desc"),
                  },
                  {
                    id: "female_south",
                    icon: "👩",
                    title: t("voice.female_south"),
                    desc: t("voice.female_south_desc"),
                  },
                  {
                    id: "male_south",
                    icon: "👨",
                    title: t("voice.male_south"),
                    desc: t("voice.male_south_desc"),
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setVoiceSettings({ voiceId: item.id as VoiceId })}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                      voiceSettings.voiceId === item.id
                        ? "bg-blue-50/90 border-primary shadow-xs ring-1 ring-primary/30"
                        : "bg-gray-50/60 border-gray-200 hover:bg-gray-100/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className={cn("text-sm font-bold", voiceSettings.voiceId === item.id ? "text-primary" : "text-[#1a2b4b]")}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                    {voiceSettings.voiceId === item.id && (
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Điều chỉnh Tốc độ đọc */}
            <div>
              <label className="text-xs font-black text-[#1a2b4b] uppercase tracking-wider block mb-2">
                {t("voice.speed")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { speed: 0.8, label: t("voice.speed_slow") },
                  { speed: 0.85, label: t("voice.speed_normal") },
                  { speed: 1.0, label: t("voice.speed_fast") }
                ].map((item) => (
                  <button
                    key={item.speed}
                    type="button"
                    onClick={() => setVoiceSettings({ speed: item.speed })}
                    className={cn(
                      "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center",
                      Math.abs(voiceSettings.speed - item.speed) < 0.04
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Điều chỉnh Âm lượng chuông / loa */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-black text-[#1a2b4b] uppercase tracking-wider">
                  {t("voice.volume")}
                </span>
                <span className="text-sm font-black text-primary font-mono">{voiceSettings.volume}%</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="100" 
                value={voiceSettings.volume} 
                onChange={(e) => setVoiceSettings({ volume: Number(e.target.value) })} 
                className="w-full accent-primary h-2.5 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Nút Nghe thử trực tiếp */}
            <button
              onClick={handleTestVoiceClick}
              disabled={isTestingVoice}
              className={cn(
                "w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95",
                isTestingVoice
                  ? "bg-emerald-600 text-white shadow-emerald-600/25"
                  : "bg-primary text-white shadow-primary/25 hover:bg-blue-700"
              )}
            >
              <Volume2 size={18} className={cn(isTestingVoice && "animate-pulse")} />
              <span>{isTestingVoice ? t("voice.testing") : t("voice.test_button")}</span>
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* 2. Font Size Settings Modal (Cỡ chữ hiển thị) */}
      {activeModal === "fontSize" && (
        <ModalWrapper title={t("font.modal_title")} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* Lựa chọn cỡ chữ */}
            <div className="space-y-2.5">
              {[
                { 
                  key: "normal", 
                  title: t("font.normal"), 
                  desc: t("font.normal_desc") 
                },
                { 
                  key: "large", 
                  title: t("font.large"), 
                  desc: t("font.large_desc") 
                },
                { 
                  key: "xl", 
                  title: t("font.xl"), 
                  desc: t("font.xl_desc") 
                }
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => setFontSize(item.key as FontSize)}
                  className={cn(
                    "p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                    fontSize === item.key 
                      ? "bg-blue-50/90 border-primary text-primary shadow-xs ring-1 ring-primary/30" 
                      : "bg-gray-50/60 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <div>
                    <span className={cn("text-base font-bold block", fontSize === item.key ? "text-primary" : "text-[#1a2b4b]")}>
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-500 font-normal mt-0.5 block">
                      {item.desc}
                    </span>
                  </div>
                  {fontSize === item.key && (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* KHUNG XEM TRƯỚC TRỰC TIẾP (LIVE PREVIEW) */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-2">
              <div className="flex items-center gap-1.5 text-primary text-xs font-black uppercase tracking-wider">
                <Sparkles size={15} />
                <span>{t("font.preview_title")}</span>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-xs flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-primary flex items-center justify-center shrink-0 font-bold">
                  <Pill size={18} />
                </div>
                <div>
                  <p className="font-extrabold text-[#1a2b4b] leading-tight">
                    {language === 'en' ? "Blood Pressure Medication" : "Thuốc Huyết Áp Amlodipine 5mg"}
                  </p>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    {t("font.preview_text")}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 rounded-2xl bg-[#1a2b4b] text-white font-bold text-sm shadow-md hover:bg-black active:scale-95 transition-all cursor-pointer"
            >
              {language === 'en' ? "Apply & Close" : "Áp dụng & Đóng"}
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* 3. Language Modal (Chọn ngôn ngữ) */}
      {activeModal === "language" && (
        <ModalWrapper title={t("lang.modal_title")} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            {[
              { key: "vi", flag: "🇻🇳", label: t("lang.vi"), sub: "Giao diện & Giọng nói thuần Việt" },
              { key: "en", flag: "🇺🇸", label: t("lang.en"), sub: "English interface & assistance" }
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  setLanguage(item.key as any);
                  setActiveModal(null);
                }}
                className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                  language === item.key 
                    ? "bg-blue-50/90 border-primary text-primary shadow-xs ring-1 ring-primary/30" 
                    : "bg-gray-50/60 border-gray-200 hover:bg-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.flag}</span>
                  <div>
                    <span className={cn("text-base font-bold block", language === item.key ? "text-primary" : "text-[#1a2b4b]")}>
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 font-normal">{item.sub}</span>
                  </div>
                </div>
                {language === item.key && (
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ModalWrapper>
      )}

      {/* 4. Cloud Sync Modal */}
      {activeModal === "sync" && (
        <ModalWrapper title={t("sync.modal_title")} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed text-left">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                <Cloud size={16} /> {t("sync.status")}
              </p>
              <span>{t("sync.desc")}</span>
            </div>

            <p className="text-xs text-gray-500">{t("sync.last_time")} <b>{lastSyncTime}</b></p>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
              <span>{isSyncing ? t("sync.syncing") : t("sync.button")}</span>
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* 5. User Guide Modal */}
      {activeModal === "guide" && (
        <ModalWrapper title={t("settings.guide")} onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs leading-relaxed text-gray-700 max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="font-bold text-primary mb-1">1. {language === 'en' ? "View Medication Schedule:" : "Xem lịch uống thuốc:"}</p>
              <span>{language === 'en' ? "On Home screen or 'My Meds', you can see your upcoming doses, quantity, and meal instructions (before/after meals)." : "Ở Trang chủ hoặc mục 'Thuốc của tôi', Bác có thể xem rõ cữ thuốc tiếp theo cần uống, liều lượng và cách dùng (uống sau ăn hoặc trước ăn)."}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <p className="font-bold text-emerald-700 mb-1">2. {language === 'en' ? "Confirm Intake & Take Photo:" : "Xác nhận đã uống & Chụp ảnh:"}</p>
              <span>{language === 'en' ? "When the alarm rings, tap 'Taken + Photo' to take a quick picture of the blister pack. The photo is automatically sent to your family." : "Khi chuông báo reng hoặc khi uống xong, Bác bấm nút 'Đã uống + Chụp ảnh' để máy ảnh bật lên chụp vỉ thuốc gửi ngay cho con cái an tâm."}</span>
            </div>
            <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
              <p className="font-bold text-red-700 mb-1">3. {language === 'en' ? "Emergency SOS Button:" : "Báo động khẩn cấp SOS:"}</p>
              <span>{language === 'en' ? "In case of dizziness or emergency, tap the big red SOS button to broadcast your GPS location and ring your caregivers." : "Khi thấy mệt mỏi, choáng váng hoặc cần giúp đỡ, Bác bấm giữ nút SOS màu đỏ. Hệ thống sẽ tự động gọi điện và gửi định vị GPS cho người thân ngay."}</span>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 6. About Modal */}
      {activeModal === "about" && (
        <ModalWrapper title={t("settings.about")} onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-center text-xs text-gray-600">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
              HM
            </div>
            <h4 className="font-black text-lg text-[#1a2b4b]">Heymedi Healthcare</h4>
            <p className="text-gray-500 font-medium">Phiên bản 1.0.0 • Giải pháp đồng hành sức khỏe gia đình</p>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 text-left space-y-1 mt-2">
              <p className="font-bold text-[#1a2b4b]">Tổng đài hỗ trợ kỹ thuật 24/7:</p>
              <p className="text-primary font-bold text-base flex items-center gap-1.5">
                <Phone size={16} /> 1900 6868
              </p>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 7. Logout Confirmation Modal */}
      {activeModal === "logout" && (
        <ModalWrapper title={t("logout.confirm_title")} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600 leading-relaxed">
              {t("logout.confirm_msg")}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setActiveModal(null)} 
                className="py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 cursor-pointer"
              >
                {t("logout.cancel")}
              </button>
              <button 
                onClick={onLogout} 
                className="py-3.5 rounded-2xl bg-danger text-white font-bold text-sm shadow-md hover:bg-red-700 cursor-pointer"
              >
                {t("logout.confirm")}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

    </div>
  );
}

function SettingItem({
  icon,
  label,
  value,
  onClick,
  hasBorder
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
  hasBorder?: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors select-none",
        hasBorder && "border-b border-gray-100"
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-6 text-[#1a2b4b]">{icon}</div>
        <span className="text-[#1a2b4b] font-semibold text-base">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-gray-500 text-sm font-medium">{value}</span>}
        <ChevronRight className="text-gray-400" size={18} />
      </div>
    </div>
  );
}

function ModalWrapper({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-slide-up sm:animate-scale-up space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-lg text-[#1a2b4b]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
