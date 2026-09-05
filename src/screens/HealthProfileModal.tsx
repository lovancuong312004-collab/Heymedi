import { X, Calendar, Activity, MapPin, User as UserIcon } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function HealthProfileModal({ isOpen, onClose, user }: Props) {
  if (!isOpen) return null;

  const meta = user?.user_metadata || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in bg-black/40 backdrop-blur-sm">
      <div 
        className="w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-[#F4F7FB] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white rounded-t-3xl sm:rounded-t-3xl shrink-0">
          <h2 className="text-xl font-bold text-[#1A2B4B]">Hồ sơ sức khỏe</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Main Info */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 shrink-0">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#1a2b4b] font-bold text-xl mb-0.5">{meta.full_name || "Ông/Bà"}</h2>
              <p className="text-gray-500 text-sm">Bệnh nhân</p>
            </div>
          </div>

          {/* Health Stats */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-5">
            <div className="p-4 border-b border-gray-100 bg-blue-50/50">
              <h3 className="font-bold text-[#1A2B4B] flex items-center gap-2">
                <Activity size={18} className="text-primary" /> 
                Chỉ số cơ thể
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              <div>
                <p className="text-gray-400 text-xs font-medium mb-1">Chiều cao</p>
                <p className="text-[#1a2b4b] font-bold text-lg">{meta.height ? `${meta.height} cm` : "Chưa cập nhật"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium mb-1">Cân nặng</p>
                <p className="text-[#1a2b4b] font-bold text-lg">{meta.weight ? `${meta.weight} kg` : "Chưa cập nhật"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium mb-1">BMI</p>
                <p className="text-primary font-bold text-lg">
                  {meta.height && meta.weight ? (Number(meta.weight) / Math.pow(Number(meta.height)/100, 2)).toFixed(1) : "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium mb-1">Nhóm máu</p>
                <p className="text-[#1a2b4b] font-bold text-lg">Chưa rõ</p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-5">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-[#1A2B4B] flex items-center gap-2">
                <UserIcon size={18} className="text-gray-500" /> 
                Thông tin cá nhân
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-0.5">Ngày sinh</p>
                  <p className="text-[#1a2b4b] font-semibold">{meta.dob ? new Date(meta.dob).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserIcon size={20} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-0.5">Giới tính</p>
                  <p className="text-[#1a2b4b] font-semibold">{meta.gender || "Chưa cập nhật"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-0.5">Địa chỉ</p>
                  <p className="text-[#1a2b4b] font-semibold">{meta.address || "Chưa cập nhật"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-5">
            <div className="p-4 border-b border-gray-100 bg-red-50/50">
              <h3 className="font-bold text-danger flex items-center gap-2">
                <Activity size={18} /> 
                Tiền sử bệnh lý
              </h3>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1.5 bg-red-50 text-danger text-xs font-bold rounded-xl border border-red-100">Cao huyết áp</span>
                <span className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-bold rounded-xl border border-orange-100">Tiểu đường tuýp 2</span>
              </div>
              <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-50 hover:border-primary hover:text-primary transition-all">
                + Thêm bệnh lý
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
