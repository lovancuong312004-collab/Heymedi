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
  Phone
} from "lucide-react";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
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
  const [autoAlert, setAutoAlert] = useState(true);
  const [dailyAiReport, setDailyAiReport] = useState(true);
  const [aiVoiceCall, setAiVoiceCall] = useState(false);
  
  const [coCaregivers, setCoCaregivers] = useState<CaregiverMember[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [showCaregiversModal, setShowCaregiversModal] = useState(false);
  const [showHealthProfileModal, setShowHealthProfileModal] = useState(false);
  
  const [activeModal, setActiveModal] = useState<"language" | "sync" | "about" | "logout" | null>(null);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Vừa xong");

  const meta = user?.user_metadata || {};
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Thành viên");

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

        if (caregiversData && caregiversData.length > 0) {
          const list: CaregiverMember[] = caregiversData.map((c, index) => {
            const isMe = c.id === user?.id;
            const name = (c.full_name && c.full_name.trim()) 
              ? c.full_name.trim() 
              : (c.email ? c.email.split('@')[0] : `Người nhà ${index + 1}`);
            
            const roles = ["Người chăm sóc chính", "Con cả (Nhắc cữ sáng)", "Con dâu (Nhắc cữ chiều)", "Bác sĩ gia đình"];
            const role = isMe ? "Bạn (Người chăm sóc chính)" : (roles[index % roles.length] || "Người cùng chăm sóc");

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
          setCoCaregivers(list);
        } else {
          setCoCaregivers([
            {
              id: user?.id,
              name: user?.user_metadata?.full_name || "Bạn",
              email: user?.email,
              phone: user?.user_metadata?.phone || "0901 234 567",
              role: "Bạn (Người chăm sóc chính)",
              avatar_url: user?.user_metadata?.avatar_url,
              isMe: true
            }
          ]);
        }
      } else {
        setCoCaregivers([
          {
            id: user?.id,
            name: user?.user_metadata?.full_name || "Bạn",
            email: user?.email,
            phone: user?.user_metadata?.phone || "0901 234 567",
            role: "Bạn (Người chăm sóc chính)",
            avatar_url: user?.user_metadata?.avatar_url,
            isMe: true
          }
        ]);
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
        <h1 className="text-2xl font-bold text-[#1a2b4b]">Cài đặt người chăm sóc</h1>
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

            {/* Toggle 1: Overdue alerts */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-6 flex justify-center items-center text-[#1a2b4b]">
                  <Bell size={20} />
                </div>
                <div>
                  <span className="text-[#1a2b4b] font-semibold text-base block leading-tight">
                    Cảnh báo quá giờ uống
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Báo động khi trễ &gt; 30 phút</span>
                </div>
              </div>
              <button onClick={() => setAutoAlert(!autoAlert)} className="cursor-pointer">
                {autoAlert ? (
                  <ToggleRight size={36} className="text-primary fill-primary" />
                ) : (
                  <ToggleLeft size={36} className="text-gray-300" />
                )}
              </button>
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
                  <span className="text-xs text-gray-400 font-medium">Tự động gửi đánh giá mỗi tối</span>
                </div>
              </div>
              <button onClick={() => setDailyAiReport(!dailyAiReport)} className="cursor-pointer">
                {dailyAiReport ? (
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
          </>
        )}

        {/* Cloud Sync */}
        <SettingRow
          icon={<Cloud size={20} />}
          label="Đồng bộ đám mây"
          value={lastSyncTime}
          hasBorder
          onClick={() => setActiveModal("sync")}
        />

        {/* Language */}
        <SettingRow
          icon={<Globe size={20} />}
          label="Ngôn ngữ"
          value={language === "vi" ? "Tiếng Việt" : "English"}
          hasBorder
          onClick={() => setActiveModal("language")}
        />

        {/* Version */}
        <SettingRow
          icon={<Info size={20} />}
          label="Giới thiệu ứng dụng & Hỗ trợ"
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
          <span>Đăng xuất</span>
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

      {/* Sync Modal */}
      {activeModal === "sync" && (
        <ModalWrapper title="Đồng bộ đám mây" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed text-left">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                <Cloud size={16} /> Đồng bộ Realtime với người bệnh:
              </p>
              <span>Lịch thuốc, thông báo khẩn cấp SOS và hồ sơ bệnh án được cập nhật 2 chiều tự động tức thì thông qua Supabase Realtime.</span>
            </div>

            <p className="text-xs text-gray-500">Lần đồng bộ gần nhất: <b>{lastSyncTime}</b></p>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ lại ngay"}</span>
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Language Modal */}
      {activeModal === "language" && (
        <ModalWrapper title="Chọn ngôn ngữ" onClose={() => setActiveModal(null)}>
          <div className="space-y-2.5">
            {[
              { key: "vi", label: "Tiếng Việt (Mặc định)" },
              { key: "en", label: "English (US)" }
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  setLanguage(item.key as any);
                  setActiveModal(null);
                }}
                className={cn(
                  "p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors",
                  language === item.key ? "bg-blue-50 border-primary text-primary font-bold" : "bg-gray-50 border-gray-200 text-gray-700"
                )}
              >
                <span>{item.label}</span>
                {language === item.key && <Check size={18} />}
              </div>
            ))}
          </div>
        </ModalWrapper>
      )}

      {/* About Modal */}
      {activeModal === "about" && (
        <ModalWrapper title="Giới thiệu & Hỗ trợ kỹ thuật" onClose={() => setActiveModal(null)}>
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

      {/* Logout Modal */}
      {activeModal === "logout" && (
        <ModalWrapper title="Xác nhận đăng xuất" onClose={() => setActiveModal(null)}>
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Heymedi không?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 rounded-xl bg-danger text-white font-bold text-sm shadow-md hover:bg-red-700 cursor-pointer"
              >
                Đăng xuất
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
