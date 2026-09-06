import { useState } from "react";
import { Plus, Scan, CheckCircle2, Users } from "lucide-react";
import ScanLinkModal from "../screens/ScanLinkModal";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";

export default function CaregiverFamilyScreen({ user }: { user: any }) {
  const { linkedPatientId, patientInfo, isLoading, refreshLink } = useFamily();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const handleUnlink = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy liên kết với thành viên này?")) return;
    try {
      const { error } = await supabase
        .from('family_links')
        .delete()
        .eq('caregiver_id', user?.id)
        .eq('patient_id', linkedPatientId);
      
      if (error) throw error;
      
      alert("Đã hủy liên kết thành công!");
      await refreshLink();
    } catch (e: any) {
      console.error(e);
      alert("Có lỗi xảy ra khi hủy liên kết: " + (e.message || "Vui lòng thử lại"));
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Đang kiểm tra dữ liệu gia đình...</p>
      </div>
    );
  }

  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split('@')[0] : "Thành viên");
  const initial = (patientName || "T")[0].toUpperCase();

  return (
    <div className="p-5 flex flex-col h-full min-h-[70vh]">
      <ScanLinkModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        user={user}
        onLinkSuccess={async () => {
          setIsLinkModalOpen(false);
          await refreshLink();
        }}
      />

      <div className="flex items-center gap-2 mb-6 mt-2">
        <Users className="text-primary" size={24} />
        <h1 className="text-[#1a2b4b] font-black text-2xl">Gia đình</h1>
      </div>

      {!linkedPatientId ? (
        <div className="flex flex-col items-center justify-center flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary border-4 border-white shadow-sm">
            <Scan size={40} />
          </div>
          <h2 className="text-[#1a2b4b] font-bold text-2xl mb-2">Chưa có liên kết</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Bạn cần liên kết với tài khoản của người thân để có thể theo dõi lịch uống thuốc và nhận thông báo nhắc nhở.
          </p>
          <button 
            onClick={() => setIsLinkModalOpen(true)}
            className="w-full max-w-[250px] bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} /> LIÊN KẾT BẰNG MÃ / QR
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-green-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10"></div>
            
            <div className="flex items-center gap-2 text-success font-bold text-sm mb-4">
              <CheckCircle2 size={18} />
              <span>Đã liên kết thành công</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-100 shadow-sm shrink-0 bg-blue-50 flex items-center justify-center text-primary font-bold text-2xl">
                {patientInfo?.avatar_url ? (
                  <img src={patientInfo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-0.5">Đang theo dõi sức khỏe cho</p>
                <h2 className="text-[#1a2b4b] font-black text-xl">{patientInfo?.name || 'Đang tải...'}</h2>
                {patientInfo?.email && <p className="text-gray-400 text-xs mt-0.5">{patientInfo.email}</p>}
              </div>
            </div>

            <button 
              onClick={handleUnlink}
              className="w-full py-3 bg-red-50 text-danger rounded-xl font-bold text-sm active:scale-95 transition-all cursor-pointer hover:bg-red-100"
            >
              Hủy liên kết
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
