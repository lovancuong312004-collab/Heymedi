import { User, Bell, Volume2, Globe, Cloud, HelpCircle, Info, ChevronRight, LogOut } from "lucide-react";

interface Props {
  user: any;
  onLogout: () => void;
}

export default function SettingsScreen({ user, onLogout }: Props) {
  const meta = user?.user_metadata || {};

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB]">
      <div className="flex justify-center items-center mb-6 mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b]">Cài đặt</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 shrink-0">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h2 className="text-[#1a2b4b] font-bold text-xl mb-0.5">{meta.full_name || "Khách"}</h2>
          <p className="text-gray-500 text-sm">{meta.phone || "Chưa cập nhật SĐT"}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-6">
        <SettingItem icon={<User size={22} />}       label="Thông tin tài khoản"          hasBorder />
        <SettingItem icon={<Bell size={22} />}        label="Thông báo nhắc thuốc"          hasBorder />
        <SettingItem icon={<Volume2 size={22} />}     label="Âm thanh & Giọng nói"          hasBorder />
        <SettingItem icon={<Globe size={22} />}       label="Ngôn ngữ" value="Tiếng Việt"   hasBorder />
        <SettingItem icon={<Cloud size={22} />}       label="Sao lưu & Đồng bộ dữ liệu"   hasBorder />
        <SettingItem icon={<HelpCircle size={22} />}  label="Hướng dẫn sử dụng"            hasBorder />
        <SettingItem icon={<Info size={22} />}        label="Giới thiệu ứng dụng" value="Phiên bản 1.0.0" />
      </div>

      <div className="mt-auto pb-4">
        <button onClick={onLogout} className="w-full bg-white text-danger border border-red-200 py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer">
          <LogOut size={20} className="text-danger" strokeWidth={2.5} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

function SettingItem({ icon, label, value, hasBorder }: { icon: React.ReactNode; label: string; value?: string; hasBorder?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${hasBorder ? 'border-b border-gray-100' : ''}`}>
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
