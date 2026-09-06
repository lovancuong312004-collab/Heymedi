import { useState, useEffect } from "react";
import { Plus, ChevronRight, Heart, CheckCircle2, UserPlus, Loader2 } from "lucide-react";
import HealthProfileModal from "./screens/HealthProfileModal";
import GenerateLinkModal from "./screens/GenerateLinkModal";
import { supabase } from "./lib/supabase";

interface Props {
  user: any;
}

export default function FamilyScreen({ user }: Props) {
  const [isHealthProfileOpen, setIsHealthProfileOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaregivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('family_links')
        .select('caregiver_id')
        .eq('patient_id', user.id);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // We have linked caregivers, let's fetch their profiles
        const caregiverIds = data.map(d => d.caregiver_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', caregiverIds);
          
        if (profiles) {
          const members = profiles.map(p => ({
            id: p.id,
            name: p.full_name || "Người chăm sóc",
            role: "Đang theo dõi bạn",
            imgSrc: p.avatar_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
          }));
          setFamilyMembers(members);
        }
      } else {
        setFamilyMembers([]);
      }
    } catch (e) {
      console.error("Failed to fetch caregivers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCaregivers();
      
      const channel = supabase.channel('family-links-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_links', filter: `patient_id=eq.${user.id}` }, () => {
          fetchCaregivers();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      }
    }
  }, [user?.id]);

  return (
    <div className="p-4 flex flex-col min-h-full bg-[#F4F7FB] pb-10">
      
      <HealthProfileModal 
        isOpen={isHealthProfileOpen}
        onClose={() => setIsHealthProfileOpen(false)}
        user={user}
      />

      <GenerateLinkModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        user={user}
      />

      {/* 1. Header Bar */}
      <div className="flex justify-center items-center py-2 mb-3">
        <h1 className="text-xl font-bold text-[#1A2B4B] tracking-tight">Gia đình</h1>
      </div>

      {/* 2. Top Card: Hồ sơ sức khỏe của tôi */}
      <div 
        onClick={() => setIsHealthProfileOpen(true)}
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

      {/* 3. Thành viên gia đình & Người chăm sóc */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3 px-1">
          <h2 className="text-[#1A2B4B] font-bold text-base">Thành viên đã liên kết</h2>
          <button 
            onClick={() => setIsLinkModalOpen(true)}
            className="flex items-center gap-1 text-primary font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Thêm mới</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin text-primary" size={30} />
          </div>
        ) : familyMembers.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3 text-primary">
              <UserPlus size={28} />
            </div>
            <h3 className="text-[#1A2B4B] font-bold text-base mb-1">Chưa có ai liên kết</h3>
            <p className="text-gray-500 text-sm mb-4">Kết nối với người thân để họ giúp bạn theo dõi lịch uống thuốc.</p>
            <button 
              onClick={() => setIsLinkModalOpen(true)}
              className="bg-primary text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md shadow-primary/20 active:scale-95 transition-all"
            >
              Liên kết bằng Mã / QR
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 flex flex-col overflow-hidden">
            {familyMembers.map((member, idx) => (
              <MemberItem 
                key={member.id}
                name={member.name}
                role={member.role}
                imgSrc={member.imgSrc}
                hasBorder={idx < familyMembers.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Quyền của người chăm sóc */}
      <div className="bg-white/70 rounded-3xl border border-gray-100/80 p-4 mt-auto">
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
