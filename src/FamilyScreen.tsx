import { Plus, ChevronRight, Heart, CheckCircle2 } from "lucide-react";

export default function FamilyScreen() {
  return (
    <div className="p-4 flex flex-col min-h-full bg-[#F4F7FB] pb-10">
      
      {/* 1. Header Bar */}
      <div className="flex justify-center items-center py-2 mb-3">
        <h1 className="text-xl font-bold text-[#1A2B4B] tracking-tight">Gia đình</h1>
      </div>

      {/* 2. Top Card: Hồ sơ sức khỏe của tôi */}
      <div 
        onClick={() => alert("Mở Hồ sơ sức khỏe của tôi")}
        className="bg-white rounded-3xl p-4 flex items-center justify-between border border-blue-50 shadow-sm cursor-pointer hover:bg-blue-50/30 active:scale-[0.98] transition-all mb-5 group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
             <Heart fill="currentColor" size={22} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[#1A2B4B] font-bold text-base leading-tight mb-1">
              Hồ sơ sức khỏe của tôi
            </h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed line-clamp-2">
              Xem và quản lý thông tin sức khỏe và tiền sử bệnh
            </p>
          </div>
        </div>
        <ChevronRight className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" size={18} />
      </div>

      {/* 3. Thành viên gia đình */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2.5 px-1">
          <h2 className="text-[#1A2B4B] font-bold text-base">Thành viên gia đình</h2>
          <button 
            onClick={() => alert("Thêm thành viên mới")}
            className="flex items-center gap-1 text-primary font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Thêm thành viên</span>
          </button>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 flex flex-col overflow-hidden">
          <MemberItem 
            name="Bà Lan (Vợ)"
            role="Đã liên kết"
            imgSrc="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
            hasBorder
          />
          <MemberItem 
            name="Cháu An (Con trai)"
            role="Người chăm sóc"
            imgSrc="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
            hasBorder
          />
          <MemberItem 
            name="Chị Hương (Con gái)"
            role="Đã liên kết"
            imgSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
          />
        </div>
      </div>

      {/* 4. Người chăm sóc */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2.5 px-1">
          <h2 className="text-[#1A2B4B] font-bold text-base">Người chăm sóc</h2>
          <button 
            onClick={() => alert("Liên kết người chăm sóc")}
            className="flex items-center gap-1 text-primary font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Liên kết</span>
          </button>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face" 
              alt="Cháu An" 
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0" 
            />
            <div className="min-w-0">
              <h4 className="text-[#1A2B4B] font-bold text-base leading-tight truncate">
                Cháu An <span className="text-gray-500 font-normal text-xs">(Con trai)</span>
              </h4>
              <p className="text-gray-500 text-xs font-semibold mt-1">
                SĐT: 0901 234 567
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full font-bold text-xs bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0 select-none">
            Đang chăm sóc
          </span>
        </div>
      </div>

      {/* 5. Quyền của người chăm sóc */}
      <div className="bg-white/70 rounded-3xl border border-gray-100/80 p-4">
        <h3 className="text-[#1A2B4B] font-bold text-sm mb-3">Quyền của người chăm sóc</h3>
        <div className="flex flex-col gap-2.5">
          <PermissionItem text="Xem lịch uống thuốc" />
          <PermissionItem text="Nhận thông báo nhắc thuốc" />
          <PermissionItem text="Quản lý thuốc và lịch uống" />
          <PermissionItem text="Xem báo cáo sức khỏe" />
        </div>
      </div>

    </div>
  );
}

function MemberItem({ name, role, imgSrc, hasBorder }: { name: string; role: string; imgSrc: string; hasBorder?: boolean }) {
  return (
    <div 
      onClick={() => alert(`Xem chi tiết: ${name}`)}
      className={`flex items-center justify-between p-3.5 cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors group ${hasBorder ? 'border-b border-gray-100' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <img 
          src={imgSrc} 
          alt={name} 
          className="w-11 h-11 rounded-full object-cover border border-gray-100 shadow-sm shrink-0" 
        />
        <div className="min-w-0">
          <h4 className="text-[#1A2B4B] font-bold text-sm leading-tight truncate">{name}</h4>
          <p className="text-gray-500 text-xs font-medium mt-1">{role}</p>
        </div>
      </div>
      <ChevronRight className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" size={18} />
    </div>
  );
}

function PermissionItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0">
        <CheckCircle2 className="text-emerald-600" size={16} strokeWidth={2.8} />
      </div>
      <span className="text-gray-700 font-medium text-xs leading-tight">{text}</span>
    </div>
  );
}
