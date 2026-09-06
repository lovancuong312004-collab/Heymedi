import { useState } from "react";
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
  ToggleRight
} from "lucide-react";
import { useFamily } from "../contexts/FamilyContext";

interface Props {
  user: any;
  onLogout: () => void;
}

export default function CaregiverSettings({ user, onLogout }: Props) {
  const { linkedPatientId, patientInfo } = useFamily();
  const [autoAlert, setAutoAlert] = useState(true);
  const [dailyAiReport, setDailyAiReport] = useState(true);
  const [aiVoiceCall, setAiVoiceCall] = useState(false);
  const meta = user?.user_metadata || {};
  
  const patientName = patientInfo?.name || "Người bệnh";

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB] animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-center items-center mb-4 mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b]">Cài đặt người chăm sóc</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5 mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
          {meta.avatar_url ? (
            <img 
              src={meta.avatar_url} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-bold text-gray-500">{(meta.full_name || "C")[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1a2b4b] truncate">{meta.full_name || "Khách"}</h3>
            <span className="text-[10px] font-bold bg-[#EBF1FF] text-primary px-2 py-0.5 rounded-full shrink-0">
              Người chăm sóc
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">SĐT: {meta.phone || "Chưa cập nhật"}</p>
          {linkedPatientId ? (
            <p className="text-xs text-success font-bold mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              Đang quản lý: {patientName}
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
              label={`Hồ sơ bệnh án của ${patientName}`}
              value="Xem chi tiết"
              hasBorder
              onClick={() => alert(`Hồ sơ bệnh án của ${patientName} đang được cập nhật.`)}
            />

            {/* Co-caregivers */}
            <SettingRow
              icon={<Users size={20} />}
              label="Người cùng chăm sóc"
              value="Thêm"
              hasBorder
              onClick={() => alert(`Mời thêm thành viên trong gia đình cùng theo dõi lịch uống thuốc của ${patientName}`)}
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

        {/* Language */}
        <SettingRow
          icon={<Globe size={20} />}
          label="Ngôn ngữ"
          value="Tiếng Việt"
          hasBorder
        />

        {/* Version */}
        <SettingRow
          icon={<Info size={20} />}
          label="Giới thiệu ứng dụng"
          value="Phiên bản 1.0.0"
        />

      </div>

      {/* Logout Button - Exactly like SettingsScreen */}
      <div className="mt-auto pb-4">
        <button
          onClick={onLogout}
          className="w-full bg-white text-danger border border-red-200 py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer"
        >
          <LogOut size={20} className="text-danger" strokeWidth={2.5} />
          <span>Đăng xuất</span>
        </button>
      </div>

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
