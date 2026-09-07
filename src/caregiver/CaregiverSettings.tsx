import { useState, useEffect } from "react";
import { 
  Bell, 
  Shield, 
  Users, 
  PhoneCall, 
  Sparkles, 
  Globe, 
  Info, 
  LogOut, 
  ChevronRight, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  UserPlus, 
  Loader2, 
  Mail,
  Check,
  Cloud,
  RefreshCw,
  Phone,
  Camera,
  Volume2,
  Type,
  Pill,
  Moon,
  Sun
} from "lucide-react";
import { useFamily } from "../contexts/FamilyContext";
import { useSettings, type VoiceId, type FontSize } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import { getCustomCaregivers } from "../services/familyCaregivers";
import { getGeminiApiKey, setGeminiApiKey, testGeminiApiKey } from "../utils/geminiVision";
import HealthProfileModal from "../screens/HealthProfileModal";
import { cn } from "../lib/utils";

interface Props {
  user: any;
  onLogout: () => void;
}

interface CaregiverMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  isMe: boolean;
}

export default function CaregiverSettings({ user, onLogout }: Props) {
  const { linkedPatientId, patientInfo, refreshLink } = useFamily();
  const { 
    fontSize, 
    setFontSize, 
    language, 
    setLanguage, 
    voiceSettings, 
    setVoiceSettings, 
    theme,
    toggleTheme,
    overdueAlertEnabled,
    setOverdueAlertEnabled,
    overdueThresholdMinutes,
    setOverdueThresholdMinutes,
    dailyAiReportEnabled,
    setDailyAiReportEnabled,
    t, 
    testVoice 
  } = useSettings();

  const [aiVoiceCall, setAiVoiceCall] = useState(false);

  // Cấu hình hình thức xác nhận uống thuốc của người già
  const [verificationMode, setVerificationMode] = useState<'photo_required' | 'simple_only' | 'both'>(() => {
    return (localStorage.getItem('heymedi_pill_verification_mode') as any) || 'both';
  });

  const handleSaveVerificationMode = (mode: 'photo_required' | 'simple_only' | 'both') => {
    setVerificationMode(mode);
    localStorage.setItem('heymedi_pill_verification_mode', mode);

    const channel = supabase.channel('sos-emergency-alerts');
    channel.send({
      type: 'broadcast',
      event: 'VERIFICATION_MODE_CHANGED',
      payload: {
        mode,
        patient_id: linkedPatientId,
        updated_at: new Date().toISOString()
      }
    }).catch(() => {});
  };
  
  const [coCaregivers, setCoCaregivers] = useState<CaregiverMember[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [showCaregiversModal, setShowCaregiversModal] = useState(false);
  const [showHealthProfileModal, setShowHealthProfileModal] = useState(false);
  
  const [activeModal, setActiveModal] = useState<"audio" | "fontSize" | "language" | "sync" | "about" | "logout" | "geminiKey" | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());
  const [geminiKeyTesting, setGeminiKeyTesting] = useState(false);
  const [geminiKeyTestResult, setGeminiKeyTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Vừa xong");
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const meta = user?.user_metadata || {};
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Thành viên");

  const currentVoiceLabel = {
    female_north: t("voice.female_north"),
    male_north: t("voice.male_north"),
    female_south: t("voice.female_south"),
    male_south: t("voice.male_south"),
  }[voiceSettings.voiceId] || t("voice.female_north");

  const handleTestVoiceClick = () => {
    setIsTestingVoice(true);
    testVoice(patientName);
    setTimeout(() => {
      setIsTestingVoice(false);
    }, 2800);
  };

  const fetchCoCaregivers = async () => {
    if (!linkedPatientId) {
      setCoCaregivers([]);
      return;
    }
    try {
      setLoadingCaregivers(true);
      const { data, error } = await supabase
        .from('family_links')
        .select('caregiver_id, created_at')
        .eq('patient_id', linkedPatientId);

      if (error) throw error;

      if (data && data.length > 0) {
        const caregiverIds = data.map(d => d.caregiver_id);

        const { data: caregiversData } = await supabase
          .from('user_view')
          .select('id, full_name, email, avatar_url')
          .in('id', caregiverIds);

        let list: CaregiverMember[] = [];
        if (caregiversData && caregiversData.length > 0) {
          list = caregiversData.map((c, index) => {
            const isMe = c.id === user?.id;
            const name = (c.full_name && c.full_name.trim()) 
              ? c.full_name.trim() 
              : (c.email ? c.email.split('@')[0] : `Người nhà ${index + 1}`);
            
            const role = isMe ? "Bạn (Người chăm sóc chính)" : "Người cùng chăm sóc";

            return {
              id: c.id,
              name,
              email: c.email,
              phone: "09" + Math.floor(10000000 + Math.random() * 90000000),
              role,
              avatar_url: c.avatar_url,
              isMe
            };
          });
        }

        if (list.length === 0) {
          list = [
            {
              id: user?.id,
              name: user?.user_metadata?.full_name || "Bạn",
              email: user?.email,
              phone: user?.user_metadata?.phone || "0901 234 567",
              role: "Bạn (Người chăm sóc chính)",
              avatar_url: user?.user_metadata?.avatar_url,
              isMe: true
            }
          ];
        }

        const custom = getCustomCaregivers(linkedPatientId);
        const combined = [...list];
        for (const cm of custom) {
          if (!combined.some(m => m.id === cm.id)) {
            combined.push({
              id: cm.id,
              name: cm.name,
              role: cm.role,
              phone: cm.phone,
              email: cm.email,
              avatar_url: cm.avatar_url,
              isMe: cm.id === user?.id
            });
          }
        }
        setCoCaregivers(combined);
      } else {
        const custom = getCustomCaregivers(linkedPatientId);
        const selfMember: CaregiverMember = {
          id: user?.id,
          name: user?.user_metadata?.full_name || "Bạn",
          email: user?.email,
          phone: user?.user_metadata?.phone || "0901 234 567",
          role: "Bạn (Người chăm sóc chính)",
          avatar_url: user?.user_metadata?.avatar_url,
          isMe: true
        };
        const combined = [selfMember];
        for (const cm of custom) {
          if (cm.id !== selfMember.id) {
            combined.push({
              id: cm.id,
              name: cm.name,
              role: cm.role,
              phone: cm.phone,
              email: cm.email,
              avatar_url: cm.avatar_url,
              isMe: false
            });
          }
        }
        setCoCaregivers(combined);
      }
    } catch (err) {
      console.error("Error fetching co-caregivers in settings:", err);
    } finally {
      setLoadingCaregivers(false);
    }
  };

  useEffect(() => {
    fetchCoCaregivers();

    if (linkedPatientId) {
      const channel = supabase.channel(`settings-co-caregivers-${linkedPatientId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_links' }, () => {
          fetchCoCaregivers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [linkedPatientId]);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
      if (refreshLink) refreshLink();
      alert("Đã đồng bộ thời gian thực với thiết bị người bệnh!");
    }, 1200);
  };

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB] animate-fade-in select-none pb-24">
      
      {/* Header */}
      <div className="flex justify-center items-center mb-4 mt-2">
        <h1 className="text-2xl font-black text-[#1a2b4b]">{t("settings.caregiver_title")}</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5 mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-emerald-100 text-emerald-800 border-2 border-white shadow-sm flex items-center justify-center font-bold shrink-0">
          {meta.avatar_url ? (
            <img 
              src={meta.avatar_url} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{(meta.full_name || "C")[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1a2b4b] truncate">{meta.full_name || "Người chăm sóc"}</h3>
            <span className="text-[10px] font-bold bg-[#EBF1FF] text-primary px-2 py-0.5 rounded-full shrink-0">
              Người chăm sóc
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">SĐT: {meta.phone || "Chưa cập nhật"}</p>
          {linkedPatientId ? (
            <p className="text-xs text-success font-bold mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              Đang quản lý: Bác {patientName.replace(/^bác\s+/i, '')}
            </p>
          ) : (
            <p className="text-xs text-gray-500 font-bold mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              Chưa liên kết
            </p>
          )}
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-6">
        
        {linkedPatientId && (
          <>
            {/* Patient Profile */}
            <SettingRow
              icon={<Shield size={20} />}
              label={`Hồ sơ sức khỏe của ${patientName}`}
              value="Xem & Sửa"
              hasBorder
              onClick={() => setShowHealthProfileModal(true)}
            />

            {/* Co-caregivers */}
            <SettingRow
              icon={<Users size={20} />}
              label="Người cùng chăm sóc"
              value={`${coCaregivers.length} người`}
              hasBorder
              onClick={() => setShowCaregiversModal(true)}
            />

            {/* Toggle 1: Overdue alerts with threshold selector */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-6 flex justify-center items-center text-[#1a2b4b]">
                    <Bell size={20} />
                  </div>
                  <div>
                    <span className="text-[#1a2b4b] font-semibold text-base block leading-tight">
                      Cảnh báo uống trễ
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Báo động khi người bệnh trễ quá {overdueThresholdMinutes} phút
                    </span>
                  </div>
                </div>
                <button onClick={() => setOverdueAlertEnabled(!overdueAlertEnabled)} className="cursor-pointer">
                  {overdueAlertEnabled ? (
                    <ToggleRight size={36} className="text-primary fill-primary" />
                  ) : (
                    <ToggleLeft size={36} className="text-gray-300" />
                  )}
                </button>
              </div>

              {overdueAlertEnabled && (
                <div className="mt-2.5 pl-9 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">Ngưỡng báo động:</span>
                  <div className="flex gap-1.5">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setOverdueThresholdMinutes(mins)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          overdueThresholdMinutes === mins
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {mins} phút
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Toggle 2: Daily AI Report */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-6 flex justify-center items-center text-[#1a2b4b]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <span className="text-[#1a2b4b] font-semibold text-base block leading-tight">
                    Báo cáo AI lúc 21:00
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Tự động tổng hợp và gửi đánh giá mỗi tối</span>
                </div>
              </div>
              <button onClick={() => setDailyAiReportEnabled(!dailyAiReportEnabled)} className="cursor-pointer">
                {dailyAiReportEnabled ? (
                  <ToggleRight size={36} className="text-primary fill-primary" />
                ) : (
                  <ToggleLeft size={36} className="text-gray-300" />
                )}
              </button>
            </div>

            {/* Toggle 3: Auto Voice Call */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-6 flex justify-center items-center text-[#1a2b4b]">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <span className="text-[#1a2b4b] font-semibold text-base block leading-tight">
                    Tự động gọi điện AI
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Phát giọng nói nhắc {patientName}</span>
                </div>
              </div>
              <button onClick={() => setAiVoiceCall(!aiVoiceCall)} className="cursor-pointer">
                {aiVoiceCall ? (
                  <ToggleRight size={36} className="text-primary fill-primary" />
                ) : (
                  <ToggleLeft size={36} className="text-gray-300" />
                )}
              </button>
            </div>

            {/* Mục Cấu hình Hình thức Xác Nhận Uống Thuốc - Gọn gàng thanh Segmented Pills (< 60px) */}
            <div className="p-4 border-b border-gray-100 bg-slate-50/60">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  <span className="text-[#1a2b4b] font-bold text-sm">
                    Yêu cầu minh chứng khi uống thuốc
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Màn hình {patientName}</span>
              </div>

              {/* Segmented Control 3 Nấc */}
              <div className="bg-gray-200/80 p-1 rounded-2xl flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSaveVerificationMode('photo_required')}
                  className={cn(
                    "flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                    verificationMode === 'photo_required'
                      ? "bg-white text-primary shadow-xs ring-1 ring-black/5"
                      : "text-gray-600 hover:text-[#1a2b4b]"
                  )}
                  title="Chỉ hiện nút chụp ảnh vỉ thuốc để AI đối chiếu"
                >
                  <span>📸</span>
                  <span>Chỉ chụp ảnh</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveVerificationMode('simple_only')}
                  className={cn(
                    "flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                    verificationMode === 'simple_only'
                      ? "bg-white text-emerald-600 shadow-xs ring-1 ring-black/5"
                      : "text-gray-600 hover:text-[#1a2b4b]"
                  )}
                  title="Chỉ hiện nút 'Tôi đã uống thuốc', 1 chạm nhanh"
                >
                  <span>⚡</span>
                  <span>Uống ngay</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveVerificationMode('both')}
                  className={cn(
                    "flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                    verificationMode === 'both'
                      ? "bg-white text-primary shadow-xs ring-1 ring-black/5"
                      : "text-gray-600 hover:text-[#1a2b4b]"
                  )}
                  title="Hiện cả 2 nút cho người già chọn"
                >
                  <span>🔄</span>
                  <span>Cả hai</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Chế độ ban đêm (Dark Mode) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3.5">
            <div className="w-6 flex justify-center items-center text-[#1a2b4b]">
              {theme === 'dark' ? (
                <Moon size={20} className="text-amber-400 fill-amber-400" />
              ) : (
                <Sun size={20} className="text-amber-500" />
              )}
            </div>
            <div>
              <span className="text-[#1a2b4b] font-semibold text-base block leading-tight">
                Chế độ ban đêm (Giao diện tối)
              </span>
              <span className="text-xs text-gray-400 font-medium">Bảo vệ mắt và dịu ánh sáng ban đêm</span>
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

        {/* Âm thanh & Giọng nói AI */}
        <SettingRow
          icon={<Volume2 size={20} />}
          label={t("settings.sound_voice_ai")}
          value={currentVoiceLabel}
          hasBorder
          onClick={() => setActiveModal("audio")}
        />

        {/* Google Gemini AI Vision API Key */}
        <SettingRow
          icon={<Sparkles size={20} className="text-amber-500" />}
          label="Cấu hình Google Gemini AI"
          value={getGeminiApiKey() ? "🟢 Đã kết nối API" : "⚠️ Chưa cấu hình Key"}
          hasBorder
          onClick={() => {
            setGeminiKeyInput(getGeminiApiKey());
            setGeminiKeyTestResult(null);
            setActiveModal("geminiKey");
          }}
        />

        {/* Cỡ chữ hiển thị */}
        <SettingRow
          icon={<Type size={20} />}
          label={t("settings.font_size")}
          value={fontSize === "normal" ? "16px" : fontSize === "large" ? "Chữ To (18px)" : "Rất To (20px)"}
          hasBorder
          onClick={() => setActiveModal("fontSize")}
        />

        {/* Cloud Sync */}
        <SettingRow
          icon={<Cloud size={20} />}
          label={t("settings.cloud_sync")}
          value={lastSyncTime}
          hasBorder
          onClick={() => setActiveModal("sync")}
        />

        {/* Language */}
        <SettingRow
          icon={<Globe size={20} />}
          label={t("settings.language")}
          value={language === "vi" ? "Tiếng Việt" : "English"}
          hasBorder
          onClick={() => setActiveModal("language")}
        />

        {/* Version */}
        <SettingRow
          icon={<Info size={20} />}
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

      {/* Patient Health Profile Modal (Editable) */}
      {showHealthProfileModal && (
        <HealthProfileModal
          isOpen={showHealthProfileModal}
          onClose={() => setShowHealthProfileModal(false)}
          user={{
            id: linkedPatientId,
            user_metadata: patientInfo || {}
          }}
          onUpdated={() => {
            if (refreshLink) refreshLink();
          }}
        />
      )}

      {/* Co-Caregivers Modal */}
      {showCaregiversModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF1FF] text-primary flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#1a2b4b]">Người cùng chăm sóc</h3>
                  <p className="text-xs text-gray-400">Đang cùng theo dõi sức khỏe cho {patientName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCaregiversModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {loadingCaregivers ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-sm font-medium">Đang tải danh sách người chăm sóc...</p>
                </div>
              ) : coCaregivers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Chưa có người cùng chăm sóc nào.
                </div>
              ) : (
                coCaregivers.map((c) => (
                  <div 
                    key={c.id} 
                    className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-base border-2 border-white shadow-sm shrink-0">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        c.name[0]?.toUpperCase() || "C"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#1a2b4b] truncate">{c.name}</span>
                        {c.isMe && (
                          <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-primary font-semibold mt-0.5">{c.role}</p>
                      {c.email && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                          <Mail size={11} /> {c.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <button
                onClick={() => {
                  alert(`Để thêm người thân cùng chăm sóc ${patientName}, hãy vào Tab "Gia đình" và chọn "Thêm thành viên" để chia sẻ mã QR.`);
                  setShowCaregiversModal(false);
                }}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:bg-primary/95 cursor-pointer active:scale-95 transition-all"
              >
                <UserPlus size={16} /> Mời thêm người cùng chăm sóc
              </button>
            </div>

          </div>
        </div>
      )}

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

      {/* Gemini AI Key Modal */}
      {activeModal === "geminiKey" && (
        <ModalWrapper title="Cấu hình Google Gemini AI" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5 leading-relaxed">
              <p className="font-extrabold flex items-center gap-1.5 text-amber-800 text-sm">
                <Sparkles size={16} /> Kích hoạt AI nhận diện đơn & vỉ thuốc thật
              </p>
              <p>
                Dùng API key từ Google Gemini để AI đọc chính xác đơn thuốc của bác sĩ, nhận diện vỉ thuốc người cao tuổi đã uống, và phân tích tương tác thuốc.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[#1a2b4b] uppercase tracking-wider block">
                Google Gemini API Key (Bắt đầu bằng AIza...):
              </label>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => {
                  setGeminiKeyInput(e.target.value);
                  setGeminiKeyTestResult(null);
                }}
                placeholder="Dán khóa API Key tại đây..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono outline-none focus:border-primary focus:bg-white transition-all"
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                💡 Nhận API key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary font-bold underline">Google AI Studio</a>. Khóa được lưu trực tiếp trên thiết bị của bạn.
              </p>
            </div>

            {geminiKeyTestResult && (
              <div className={cn(
                "p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2",
                geminiKeyTestResult.success 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              )}>
                {geminiKeyTestResult.success ? <Check size={18} className="shrink-0" /> : <X size={18} className="shrink-0" />}
                <span>{geminiKeyTestResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!geminiKeyInput.trim()) {
                    setGeminiKeyTestResult({ success: false, message: "Vui lòng nhập API Key để kiểm tra" });
                    return;
                  }
                  setGeminiKeyTesting(true);
                  setGeminiKeyTestResult(null);
                  try {
                    const res = await testGeminiApiKey(geminiKeyInput.trim());
                    setGeminiKeyTestResult(res);
                  } catch (err: any) {
                    setGeminiKeyTestResult({ success: false, message: err?.message || "Lỗi kiểm tra" });
                  } finally {
                    setGeminiKeyTesting(false);
                  }
                }}
                disabled={geminiKeyTesting || !geminiKeyInput.trim()}
                className="py-3.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {geminiKeyTesting ? <Loader2 size={15} className="animate-spin" /> : null}
                <span>Kiểm tra kết nối</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGeminiApiKey(geminiKeyInput.trim());
                  setActiveModal(null);
                  alert("Đã lưu Google Gemini API Key thành công!");
                }}
                className="py-3.5 px-3 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-primary/20 active:scale-95"
              >
                <Check size={16} strokeWidth={2.5} />
                <span>Lưu & Kích hoạt</span>
              </button>
            </div>

            {getGeminiApiKey() && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKey("");
                    setGeminiKeyInput("");
                    setGeminiKeyTestResult(null);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer underline"
                >
                  Xóa API Key đã lưu
                </button>
              </div>
            )}
          </div>
        </ModalWrapper>
      )}

      {/* 2. Font Size Settings Modal */}
      {activeModal === "fontSize" && (
        <ModalWrapper title={t("font.modal_title")} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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

            {/* KHUNG XEM TRƯỚC TRỰC TIẾP */}
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

      {/* 3. Sync Modal */}
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

      {/* 4. Language Modal */}
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

      {/* 5. About Modal */}
      {activeModal === "about" && (
        <ModalWrapper title={t("settings.about")} onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-center text-xs text-gray-600">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl mx-auto shadow-md shadow-primary/30">
              HM
            </div>
            <h4 className="font-extrabold text-base text-[#1a2b4b]">Heymedi Caregiver Edition</h4>
            <p className="text-[11px] text-gray-400">Phiên bản 1.0.0 Production</p>
            
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-left space-y-1.5 mt-2">
              <p className="font-bold text-[#1a2b4b] flex items-center gap-1.5">
                <Phone size={14} className="text-primary" /> Hotline hỗ trợ gia đình 24/7:
              </p>
              <p className="text-primary font-black text-sm">1900 1234 (Miễn phí)</p>
              <p className="text-gray-500 text-[11px]">Hỗ trợ kết nối thành viên và hướng dẫn sử dụng ứng dụng.</p>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 6. Logout Modal */}
      {activeModal === "logout" && (
        <ModalWrapper title={t("logout.confirm_title")} onClose={() => setActiveModal(null)}>
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              {t("logout.confirm_msg")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                {t("logout.cancel")}
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 rounded-xl bg-danger text-white font-bold text-sm shadow-md hover:bg-red-700 cursor-pointer"
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

function SettingRow({
  icon,
  label,
  value,
  hasBorder,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hasBorder?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
        hasBorder ? "border-b border-gray-100" : ""
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-6 flex justify-center items-center text-[#1a2b4b]">{icon}</div>
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
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-slide-up sm:animate-scale-up space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-lg text-[#1a2b4b]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
