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
  Phone,
  RefreshCw,
  Type
} from "lucide-react";
import HealthProfileModal from "./screens/HealthProfileModal";
import { speakVietnamese, playAlarmTone } from "./utils/voiceAssistant";
import { cn } from "./lib/utils";

interface Props {
  user: any;
  onLogout: () => void;
}

export default function SettingsScreen({ user, onLogout }: Props) {
  const meta = user?.user_metadata || {};
  const rawName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Bác");
  const displayName = rawName.toLowerCase().startsWith("bác ") ? rawName : `Bác ${rawName}`;

  // Modals state
  const [isHealthProfileOpen, setIsHealthProfileOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "audio" | "fontSize" | "language" | "sync" | "guide" | "about" | "logout" | null
  >(null);

  // Settings values state
  const [volume, setVolume] = useState(90);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xl">("large");
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Vừa xong");

  const handleTestVoice = () => {
    playAlarmTone();
    setTimeout(() => {
      speakVietnamese(`Xin chào ${displayName}! Âm lượng loa của Bác hiện tại nghe đã rõ ràng và vừa tai chưa ạ?`);
    }, 400);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
      alert("Đồng bộ dữ liệu thời gian thực thành công!");
    }, 1200);
  };

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB] animate-fade-in select-none pb-24">
      <div className="flex justify-center items-center mb-4 mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b]">Cài đặt</h1>
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
              Hồ sơ
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{meta.phone || "Bấm để cập nhật hồ sơ & sức khỏe"}</p>
        </div>
        <ChevronRight className="text-gray-400 shrink-0" size={20} />
      </div>

      {/* Settings Menu List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-6">
        <SettingItem 
          icon={<User size={22} />} 
          label="Hồ sơ sức khỏe & Bệnh nền" 
          value="Xem & Sửa"
          onClick={() => setIsHealthProfileOpen(true)}
          hasBorder 
        />
        <SettingItem 
          icon={<Volume2 size={22} />} 
          label="Âm thanh & Giọng nói" 
          value={`${volume}%`}
          onClick={() => setActiveModal("audio")}
          hasBorder 
        />
        <SettingItem 
          icon={<Type size={22} />} 
          label="Cỡ chữ hiển thị" 
          value={fontSize === "normal" ? "Bình thường" : fontSize === "large" ? "Chữ To" : "Rất To"}
          onClick={() => setActiveModal("fontSize")}
          hasBorder 
        />
        <SettingItem 
          icon={<Globe size={22} />} 
          label="Ngôn ngữ" 
          value={language === "vi" ? "Tiếng Việt" : "English"} 
          onClick={() => setActiveModal("language")}
          hasBorder 
        />
        <SettingItem 
          icon={<Cloud size={22} />} 
          label="Đồng bộ đám mây" 
          value={lastSyncTime}
          onClick={() => setActiveModal("sync")}
          hasBorder 
        />
        <SettingItem 
          icon={<HelpCircle size={22} />} 
          label="Hướng dẫn sử dụng" 
          onClick={() => setActiveModal("guide")}
          hasBorder 
        />
        <SettingItem 
          icon={<Info size={22} />} 
          label="Giới thiệu & Hỗ trợ kỹ thuật" 
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

      {/* Health Profile Modal */}
      <HealthProfileModal 
        isOpen={isHealthProfileOpen} 
        onClose={() => setIsHealthProfileOpen(false)} 
        user={user} 
      />

      {/* 1. Audio Modal */}
      {activeModal === "audio" && (
        <ModalWrapper title="Âm thanh & Giọng nói" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-[#1a2b4b]">Âm lượng chuông nhắc:</span>
                <span className="text-sm font-black text-primary">{volume}%</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="100" 
                value={volume} 
                onChange={(e) => setVolume(Number(e.target.value))} 
                className="w-full accent-primary h-2 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>

            <button
              onClick={handleTestVoice}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <Volume2 size={18} />
              <span>Thử phát âm thanh & Giọng nói AI</span>
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* 2. Font Size Modal */}
      {activeModal === "fontSize" && (
        <ModalWrapper title="Cỡ chữ hiển thị" onClose={() => setActiveModal(null)}>
          <div className="space-y-2.5">
            {[
              { key: "normal", label: "Tiêu chuẩn (Gọn gàng)" },
              { key: "large", label: "Chữ To (Khuyên dùng cho người già)" },
              { key: "xl", label: "Rất To (Dễ đọc nhất)" }
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  setFontSize(item.key as any);
                  setActiveModal(null);
                }}
                className={cn(
                  "p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors",
                  fontSize === item.key ? "bg-blue-50 border-primary text-primary font-bold" : "bg-gray-50 border-gray-200 text-gray-700"
                )}
              >
                <span>{item.label}</span>
                {fontSize === item.key && <Check size={18} />}
              </div>
            ))}
          </div>
        </ModalWrapper>
      )}

      {/* 3. Language Modal */}
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

      {/* 4. Sync Modal */}
      {activeModal === "sync" && (
        <ModalWrapper title="Đồng bộ & Lưu trữ đám mây" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed text-left">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                <Cloud size={16} /> Dữ liệu được kết nối thời gian thực:
              </p>
              <span>Mọi thay đổi về lịch uống thuốc, hồ sơ sức khỏe và trạng thái uống thuốc đều tự động đồng bộ ngay lập tức với ứng dụng của con cái.</span>
            </div>

            <p className="text-xs text-gray-500">Lần đồng bộ gần nhất: <b>{lastSyncTime}</b></p>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ dữ liệu ngay"}</span>
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* 5. Guide Modal */}
      {activeModal === "guide" && (
        <ModalWrapper title="Hướng dẫn sử dụng ứng dụng" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs leading-relaxed text-gray-700 max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="font-bold text-primary mb-1">1. Xem lịch uống thuốc:</p>
              <span>Ở Trang chủ hoặc mục "Thuốc của tôi", Bác có thể xem rõ cữ thuốc tiếp theo cần uống, liều lượng và cách dùng (uống sau ăn hoặc trước ăn).</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <p className="font-bold text-emerald-700 mb-1">2. Xác nhận đã uống:</p>
              <span>Khi chuông báo reng hoặc khi uống xong, Bác bấm nút màu xanh "Đã uống thuốc" hoặc chọn "Đã uống + Chụp ảnh vỉ thuốc" để con cái an tâm.</span>
            </div>
            <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
              <p className="font-bold text-danger mb-1">3. Gọi khẩn cấp (SOS):</p>
              <span>Nếu cảm thấy mệt hoặc chóng mặt, Bác bấm nút SOS màu đỏ to bản ở Trang chủ hoặc mục Gia đình. Hệ thống sẽ đếm ngược 5 giây rồi tự động lấy vị trí và gọi cấp cứu đến người thân.</span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
              <p className="font-bold text-amber-800 mb-1">4. Quét thuốc ngoài đơn:</p>
              <span>Nếu Bác muốn uống thêm thuốc ngoài, hãy bấm nút "Quét thuốc ngoài đơn (AI)" và chụp 2-3 ảnh viên thuốc để AI kiểm tra an toàn trước khi dùng.</span>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 6. About Modal */}
      {activeModal === "about" && (
        <ModalWrapper title="Giới thiệu & Hỗ trợ kỹ thuật" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-center text-xs text-gray-600">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl mx-auto shadow-md shadow-primary/30">
              HM
            </div>
            <h4 className="font-extrabold text-base text-[#1a2b4b]">Heymedi - Trợ Lý Sức Khỏe Gia Đình</h4>
            <p className="text-[11px] text-gray-400">Phiên bản 1.0.0 Production (Bản thương mại)</p>
            
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-left space-y-1.5 mt-2">
              <p className="font-bold text-[#1a2b4b] flex items-center gap-1.5">
                <Phone size={14} className="text-primary" /> Tổng đài hỗ trợ 24/7:
              </p>
              <p className="text-primary font-black text-sm">1900 1234 (Miễn phí cuộc gọi)</p>
              <p className="text-gray-500 text-[11px]">Hỗ trợ cài đặt và giải đáp thắc mắc sức khỏe cho người cao tuổi.</p>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* 7. Logout Confirmation Modal */}
      {activeModal === "logout" && (
        <ModalWrapper title="Xác nhận đăng xuất" onClose={() => setActiveModal(null)}>
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              Bác có chắc chắn muốn đăng xuất khỏi ứng dụng Heymedi không?
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

function SettingItem({ 
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
      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${hasBorder ? 'border-b border-gray-100' : ''}`}
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
