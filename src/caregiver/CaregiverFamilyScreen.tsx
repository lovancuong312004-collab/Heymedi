import { useState, useEffect } from "react";
import { Plus, Scan, CheckCircle2, Users, Phone, ShieldCheck, UserPlus, HeartHandshake, Loader2, X, Trash2, Check } from "lucide-react";
import ScanLinkModal from "../screens/ScanLinkModal";
import CallModal from "./CallModal";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
import { getCustomCaregivers, addCustomCaregiver, deleteCustomCaregiver } from "../services/familyCaregivers";
import { cn } from "../lib/utils";

export default function CaregiverFamilyScreen({ user }: { user: any }) {
  const { linkedPatientId, patientInfo, isLoading, refreshLink } = useFamily();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [coCaregivers, setCoCaregivers] = useState<any[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);

  // Form thêm người chăm sóc
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Con gái (Nhắc cữ sáng)");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  
  // Calling state
  const [callingContact, setCallingContact] = useState<{
    id?: string;
    name: string;
    role?: string;
    phone?: string;
    avatarUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (linkedPatientId) {
      fetchCoCaregivers();

      const channel = supabase.channel(`co-caregivers-${linkedPatientId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_links' }, () => {
          fetchCoCaregivers();
        })
        .on('broadcast', { event: 'FAMILY_TEAM_CHANGED' }, () => {
          fetchCoCaregivers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [linkedPatientId]);

  const fetchCoCaregivers = async () => {
    if (!linkedPatientId) return;
    try {
      setLoadingCaregivers(true);
      const { data } = await supabase
        .from('family_links')
        .select('caregiver_id, created_at')
        .eq('patient_id', linkedPatientId);

      let dbList: any[] = [];
      if (data && data.length > 0) {
        const caregiverIds = data.map(d => d.caregiver_id);

        const { data: caregiversData } = await supabase
          .from('user_view')
          .select('id, full_name, email, avatar_url')
          .in('id', caregiverIds);

        if (caregiversData && caregiversData.length > 0) {
          dbList = caregiversData.map((c, index) => {
            const isMe = c.id === user?.id;
            const name = (c.full_name && c.full_name.trim()) 
              ? c.full_name.trim() 
              : (c.email ? c.email.split('@')[0] : `Người nhà ${index + 1}`);
            
            const role = isMe ? "Bạn (Người chăm sóc chính)" : "Người chăm sóc liên kết";

            return {
              id: c.id,
              name,
              email: c.email,
              phone: isMe ? (user?.user_metadata?.phone || "0901 234 567") : "09" + Math.floor(10000000 + Math.random() * 90000000),
              role,
              avatar_url: c.avatar_url,
              isMe,
              isCustom: false
            };
          });
        }
      }

      if (dbList.length === 0) {
        dbList = [
          {
            id: user?.id,
            name: user?.user_metadata?.full_name || "Bạn",
            email: user?.email,
            phone: user?.user_metadata?.phone || "0901 234 567",
            role: "Bạn (Người chăm sóc chính)",
            isMe: true,
            isCustom: false
          }
        ];
      }

      // Lấy danh sách thành viên gia đình và người chăm sóc được cấu hình
      const customList = getCustomCaregivers(linkedPatientId);

      // Gộp danh sách, loại bỏ trùng ID
      const combined = [...dbList];
      for (const cm of customList) {
        if (!combined.some(m => m.id === cm.id)) {
          combined.push({
            ...cm,
            isMe: cm.id === user?.id,
            isCustom: true
          });
        }
      }

      setCoCaregivers(combined);
    } catch (err) {
      console.error("Error fetching co-caregivers:", err);
    } finally {
      setLoadingCaregivers(false);
    }
  };

  const handleAddNewCaregiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedPatientId || !newMemberName.trim()) {
      alert("Vui lòng nhập họ và tên người chăm sóc!");
      return;
    }

    addCustomCaregiver(linkedPatientId, {
      name: newMemberName.trim(),
      role: newMemberRole.trim() || "Người chăm sóc",
      phone: newMemberPhone.trim() || "0901 234 567"
    });

    setIsAddMemberModalOpen(false);
    setNewMemberName("");
    setNewMemberPhone("");
    fetchCoCaregivers();
  };

  const handleDeleteCaregiver = (memberId: string) => {
    if (!linkedPatientId) return;
    deleteCustomCaregiver(linkedPatientId, memberId);
    fetchCoCaregivers();
  };

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

  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split('@')[0] : "Người thân");
  const initial = (patientName || "T")[0].toUpperCase();

  return (
    <div className="p-5 flex flex-col gap-4 pb-24">
      <ScanLinkModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        user={user}
        onLinkSuccess={async () => {
          setIsLinkModalOpen(false);
          await refreshLink();
          await fetchCoCaregivers();
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Users className="text-primary" size={24} />
          <h1 className="text-[#1a2b4b] font-black text-2xl">Nhóm Gia đình</h1>
        </div>
        {linkedPatientId && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Thêm người nhà</span>
            </button>
            <button 
              onClick={() => setIsLinkModalOpen(true)}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-primary text-xs font-bold px-2.5 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer"
              title="Quét mã QR liên kết thiết bị"
            >
              <Scan size={13} />
              <span>Mã QR</span>
            </button>
          </div>
        )}
      </div>

      {!linkedPatientId ? (
        <div className="flex flex-col items-center justify-center flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center my-6">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary border-4 border-white shadow-sm">
            <Scan size={40} />
          </div>
          <h2 className="text-[#1a2b4b] font-bold text-2xl mb-2">Chưa có liên kết</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-xs">
            Bạn cần liên kết với tài khoản của người thân để theo dõi lịch uống thuốc và phối hợp cùng gia đình.
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
          {/* Card 1: Người Bệnh Được Chăm Sóc */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs bg-blue-50 px-3 py-1 rounded-full">
                <HeartHandshake size={15} />
                <span>Người bệnh đang theo dõi</span>
              </div>
              <div className="flex items-center gap-1 text-success font-bold text-xs">
                <CheckCircle2 size={14} />
                <span>Đang kết nối</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-100 shadow-sm shrink-0 bg-blue-50 flex items-center justify-center text-primary font-bold text-2xl">
                {patientInfo?.avatar_url ? (
                  <img src={patientInfo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-[#1a2b4b] font-black text-xl truncate">{patientName}</h2>
                {patientInfo?.email && <p className="text-gray-400 text-xs truncate mt-0.5">{patientInfo.email}</p>}
                <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Cập nhật thời gian thực
                </span>
              </div>
            </div>

            {/* Action Buttons for Patient */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCallingContact({
                  id: linkedPatientId || undefined,
                  name: patientName,
                  role: "Người bệnh",
                  phone: "0901 234 567",
                  avatarUrl: patientInfo?.avatar_url
                })}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone size={16} className="fill-white" />
                <span>GỌI CHO NGƯỜI BỆNH</span>
              </button>
              <button 
                onClick={handleUnlink}
                className="px-4 py-3.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-danger rounded-2xl font-bold text-xs active:scale-95 transition-all"
                title="Hủy liên kết"
              >
                Hủy
              </button>
            </div>
          </div>

          {/* Card 2: Danh Sách Tất Cả Những Người Cùng Chăm Sóc (Family Care Team) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-[#1a2b4b] font-bold text-base">Đội ngũ cùng chăm sóc</h3>
                <p className="text-gray-400 text-xs mt-0.5">Tất cả người thân cùng hỗ trợ theo dõi thuốc</p>
              </div>
              <span className="text-xs font-extrabold text-primary bg-[#EBF1FF] px-2.5 py-1 rounded-xl">
                {coCaregivers.length} thành viên
              </span>
            </div>

            {loadingCaregivers ? (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="text-primary animate-spin" />
              </div>
            ) : coCaregivers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                Chưa có ai khác cùng liên kết chăm sóc.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {coCaregivers.map((c) => (
                  <div key={c.id} className="py-3.5 flex items-center justify-between first:pt-1 last:pb-1 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-blue-200">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(c.name || "N")[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-[#1a2b4b] truncate">{c.name}</h4>
                          {c.isMe && (
                            <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                              Bạn
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate mt-0.5 font-medium">{c.role}</p>
                        {c.phone && <p className="text-[11px] text-gray-400 font-mono mt-0.5">{c.phone}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Nút Gọi cho người cùng chăm sóc */}
                      {!c.isMe ? (
                        <button 
                          onClick={() => setCallingContact({
                            id: c.id,
                            name: c.name,
                            role: c.role,
                            phone: c.phone || "0912 345 678",
                            avatarUrl: c.avatar_url
                          })}
                          className="bg-blue-50 hover:bg-blue-100 text-primary active:scale-95 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <Phone size={13} className="fill-primary" />
                          <span>Gọi</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                          <ShieldCheck size={14} /> Trực tuyến
                        </span>
                      )}

                      {/* Nút xóa thành viên thêm tay */}
                      {c.isCustom && !c.isMe && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCaregiver(c.id)}
                          className="w-7 h-7 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Xóa người chăm sóc này khỏi danh sách"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Cơ chế Phối Hợp Thông Minh */}
          <div className="bg-[#EBF1FF]/60 rounded-3xl p-5 border border-blue-100 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white text-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <ShieldCheck size={20} />
            </div>
            <div className="text-xs text-gray-700 leading-relaxed">
              <h4 className="font-bold text-[#1a2b4b] text-sm mb-1">Cơ chế đồng bộ thời gian thực</h4>
              <p className="text-gray-600">
                Khi bất kỳ ai đánh dấu thuốc đã uống hoặc người bệnh xác nhận trên điện thoại, toàn bộ nhóm gia đình sẽ nhận thông báo cập nhật ngay lập tức.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gọi điện realtime hai chiều */}
      {callingContact && (
        <CallModal 
          isOpen={!!callingContact}
          onClose={() => setCallingContact(null)}
          currentUser={user}
          targetId={callingContact.id}
          contactName={callingContact.name}
          contactRole={callingContact.role}
          contactPhone={callingContact.phone}
          avatarUrl={callingContact.avatarUrl}
          isInitiator={true}
        />
      )}

      {/* MODAL THÊM NGƯỜI CHĂM SÓC / THÀNH VIÊN GIA ĐÌNH */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#1a2b4b]">Thêm người chăm sóc</h3>
                  <p className="text-[11px] text-gray-400">Tham gia theo dõi và chăm sóc</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewCaregiver} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Ví dụ: Chị Lan, BS. Tuấn..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a2b4b] focus:border-primary outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Vai trò chăm sóc</label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="Ví dụ: Con gái (Cữ trưa), Bác sĩ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-[#1a2b4b] focus:border-primary outline-hidden mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {["Con cả", "Con gái", "Con dâu", "Bác sĩ gia đình", "Điều dưỡng"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewMemberRole(role)}
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer",
                        newMemberRole === role ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-600 border-gray-200"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Số điện thoại liên hệ</label>
                <input
                  type="tel"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-[#1a2b4b] focus:border-primary outline-hidden font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-primary/25 cursor-pointer active:scale-95 transition-all"
                >
                  <Check size={14} />
                  <span>Lưu thành viên</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
