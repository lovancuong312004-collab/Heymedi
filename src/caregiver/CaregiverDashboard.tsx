import { useState, useEffect } from "react";
import { Calendar, Phone, Plus, Scan, CheckCircle2, Clock, AlertCircle, ChevronRight, Sparkles, Loader2, Hand, Camera, X } from "lucide-react";
import { Lunar } from "lunar-javascript";
import { getTodaySchedule, getOverdueReminders, markAsTaken, getMedicationTimingOffset, getPillProof, type Reminder } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { cleanMedicineTitle } from "../utils/geminiVision";

interface Props {
  user: any;
  onOpenCall: () => void;
  onNavigateTab: (tabId: string) => void;
  onOpenAddMed: () => void;
  onOpenScan: () => void;
}

export default function CaregiverDashboard({
  user,
  onOpenCall,
  onNavigateTab,
  onOpenAddMed,
  onOpenScan
}: Props) {
  const caregiverName = user?.user_metadata?.full_name || "Caregiver";
  
  const { linkedPatientId: patientId, patientName, patientInfo, isLoading: isCheckingLink } = useFamily();
  console.log("=== DEBUG DASHBOARD: Current Patient ID ===", patientId);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [overdue, setOverdue] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [dashboardProofPhoto, setDashboardProofPhoto] = useState<{ url: string; medName: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (patientId) {
      loadData();
      
      const channelName = `caregiver-dash-${patientId}-${Date.now()}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
          loadData();
        })
        .subscribe();

      const interval = setInterval(loadData, 15000);
      
      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [patientId]);

  const loadData = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const [todayData, overdueData] = await Promise.all([
        getTodaySchedule(patientId),
        getOverdueReminders(patientId)
      ]);
      setSchedule(todayData);
      setOverdue(overdueData);
    } catch (error) {
      console.error("Failed to load caregiver data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (reminderIds: string | string[]) => {
    try {
      const ids = Array.isArray(reminderIds) ? reminderIds : [reminderIds];
      setMarkingId(ids[0] || "marking");
      for (const id of ids) {
        await markAsTaken(id);
      }
      await loadData();
    } catch (error) {
      console.error("Failed to mark as done:", error);
    } finally {
      setMarkingId(null);
    }
  };

  if (isCheckingLink) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full min-h-[70vh]">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Đang kiểm tra dữ liệu gia đình...</p>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full animate-fade-in bg-white m-4 rounded-3xl shadow-sm border border-gray-100 text-center min-h-[70vh]">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary border-4 border-white shadow-sm">
          <Scan size={40} />
        </div>
        <h2 className="text-[#1a2b4b] font-bold text-2xl mb-2">Chưa kết nối</h2>
        <p className="text-gray-500 text-sm mb-8 px-4 leading-relaxed">
          Bạn chưa liên kết với người bệnh nào. Vui lòng chuyển sang mục "Gia đình" ở thanh điều hướng để bắt đầu kết nối.
        </p>
        <button 
          onClick={() => onNavigateTab("family")}
          className="w-full max-w-[250px] bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          ĐẾN TRANG GIA ĐÌNH
        </button>
      </div>
    );
  }

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const timeString = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
  const lunarString = `(Ngày ${String(lunar.getDay()).padStart(2, '0')} tháng ${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  // Nhóm các cữ thuốc theo khung giờ thực tế trong ngày (Chuẩn y khoa: e.g. 3 cữ/ngày)
  const uniqueTimeSlots = Array.from(new Set(schedule.map(s => {
    const d = new Date(s.scheduled_time);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }))).sort();

  const totalCus = uniqueTimeSlots.length;
  const completedCount = uniqueTimeSlots.filter(time => {
    const medsInSlot = schedule.filter(s => {
      const d = new Date(s.scheduled_time);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` === time;
    });
    return medsInSlot.length > 0 && medsInSlot.every(s => s.status === 'taken');
  }).length;

  // Gom các thuốc quá giờ theo khung giờ cữ
  const overdueTimeSlot = overdue.length > 0 ? (() => {
    const firstOverdue = overdue[0];
    const d = new Date(firstOverdue.scheduled_time);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const medsInSlot = overdue.filter(o => {
      const od = new Date(o.scheduled_time);
      return `${String(od.getHours()).padStart(2, '0')}:${String(od.getMinutes()).padStart(2, '0')}` === timeStr;
    });
    return {
      timeStr,
      scheduled_time: firstOverdue.scheduled_time,
      count: medsInSlot.length,
      meds: medsInSlot,
      reminderIds: medsInSlot.map(m => m.id),
      photoUrl: medsInSlot.find(m => m.medication?.image_url)?.medication?.image_url
    };
  })() : null;

  return (
    <div className="p-5 flex flex-col gap-4 pb-24">
      {/* 1. Header (User Profile & Switcher) */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 border-2 border-white shadow-sm shrink-0 flex items-center justify-center font-bold text-emerald-800 text-sm">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (caregiverName || "C")[0].toUpperCase()
            )}
          </div>
          <div>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Người chăm sóc,</p>
            <h1 className="text-base font-black text-[#1a2b4b] flex items-center gap-1">
              {caregiverName} <Hand size={18} className="text-amber-400" fill="currentColor" />
            </h1>
          </div>
        </div>

        {/* Cared Person Pill */}
        <div 
          onClick={() => onNavigateTab("family")}
          className="bg-white border border-gray-100 shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
            {patientInfo?.avatar_url ? (
              <img src={patientInfo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (patientName || "T")[0].toUpperCase()
            )}
          </div>
          <span className="text-xs font-bold text-[#1a2b4b] max-w-[80px] truncate">{patientInfo?.name || 'người thân'}</span>
        </div>
      </div>

      {/* 2. Overview Card (Time & Overall Status) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#EBF1FF] flex items-center justify-center shrink-0">
            <Calendar size={22} className="text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[#1a2b4b] font-black text-[22px] mb-0.5 leading-none">{timeString}</h2>
            <p className="text-[#1a2b4b] font-bold text-[13px]">{dateString}</p>
            <p className="text-gray-500 text-[11px] mt-0.5 font-medium">{lunarString}</p>
          </div>
        </div>

        {/* Progress Pill Badge */}
        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-gray-400 block">Đã uống</span>
          <span className="text-base font-extrabold text-primary bg-[#EBF1FF] px-2.5 py-1 rounded-xl">
            {completedCount}/{totalCus > 0 ? totalCus : '-'} cữ
          </span>
        </div>
      </div>

      {/* 3. Hero Card: Thuốc cần nhắc nhở gấp (Quá giờ theo cữ) */}
      {overdueTimeSlot && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full border-2 border-danger flex items-center justify-center text-danger">
              <div className="w-1.5 h-1.5 bg-danger rounded-full" />
            </div>
            <h3 className="text-[#1a2b4b] font-bold text-base">Cảnh báo thuốc quá giờ</h3>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100 flex flex-col relative overflow-hidden min-h-[200px]">
            <div className="pr-20 relative z-10">
              <p className="text-danger font-bold mb-1 text-sm flex items-start gap-1.5">
                <AlertCircle size={17} className="shrink-0 mt-0.5" />
                <span className="leading-tight">
                  {overdueTimeSlot.timeStr} • Quá giờ chưa uống ({overdueTimeSlot.count} loại thuốc)!
                </span>
              </p>
              <h2 className="text-[#1a2b4b] font-black text-xl sm:text-2xl mb-1.5 leading-tight">
                {overdueTimeSlot.meds.map(m => cleanMedicineTitle(m.medication?.name || "Thuốc")).join(" • ")}
              </h2>
              <p className="text-gray-600 text-xs font-semibold leading-snug">
                {overdueTimeSlot.meds.map(m => `${cleanMedicineTitle(m.medication?.name || "Thuốc")}: ${m.medication?.dosage}`).join(", ")}
              </p>
            </div>

            <div className="absolute right-[-10px] top-4 z-0">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl shadow-sm flex items-center justify-center border-2 border-white overflow-hidden">
                {overdueTimeSlot.photoUrl ? (
                  <img src={overdueTimeSlot.photoUrl} alt="Ảnh thuốc" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">💊</span>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 flex gap-2">
              <button
                onClick={onOpenCall}
                className="flex-1 bg-danger text-white py-3 px-4 rounded-2xl font-bold text-base shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone size={18} className="fill-white" />
                GỌI NHẮC
              </button>
              <button
                onClick={() => handleMarkDone(overdueTimeSlot.reminderIds)}
                disabled={markingId !== null}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                title="Đánh dấu đã uống cả cữ"
              >
                {markingId !== null ? <Loader2 size={16} className="animate-spin" /> : "Đã uống cả cữ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Quick Action Row */}
      <div className="flex gap-3">
        {/* Thêm thuốc cho người thân */}
        <div 
          onClick={onOpenAddMed}
          className="flex-[2] bg-white rounded-2xl p-4 flex items-center gap-3.5 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 bg-primary rounded-xl text-white flex items-center justify-center shadow-sm shrink-0">
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[#1a2b4b] font-bold text-sm leading-tight truncate">
              Thêm thuốc cho {patientInfo?.name || 'người thân'}
            </h3>
            <p className="text-gray-400 text-xs mt-1 leading-tight">Cài đặt giờ nhắc & liều lượng</p>
          </div>
        </div>

        {/* Quét AI */}
        <div 
          onClick={onOpenScan}
          className="flex-[1] bg-[#EBF1FF] rounded-2xl p-3 flex flex-col items-center justify-center gap-1 border border-blue-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Scan className="text-primary" size={26} strokeWidth={2.5} />
          <span className="text-primary font-bold text-xs text-center leading-tight">Quét AI</span>
        </div>
      </div>

      {/* 5. Timeline Today */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-[#1a2b4b] font-bold text-base">Lịch trình hôm nay của {patientInfo?.name || 'người thân'}</h3>
          <button
            onClick={() => onNavigateTab("meds")}
            className="text-primary text-xs font-bold flex items-center gap-0.5 hover:underline"
          >
            Chi tiết <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={24} className="text-gray-400 animate-spin" />
            </div>
          ) : schedule.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">Chưa có lịch thuốc nào hôm nay.</div>
          ) : schedule.map((item) => {
            const isDone = item.status === "taken";
            
            // Checking if it's overdue (missed or pending and time passed > 15mins)
            const scheduledTime = new Date(item.scheduled_time);
            const now = new Date();
            const isOverdue = item.status === "missed" || (item.status === "pending" && (now.getTime() - scheduledTime.getTime() > 15 * 60000));

            const timingOffset = isDone && item.taken_at 
              ? getMedicationTimingOffset(item.scheduled_time, item.taken_at)
              : null;
            const proofUrl = (item as any).proof_image_url || getPillProof(item.id);

            return (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50/80 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    {isDone ? (
                      <CheckCircle2 size={24} className="text-success fill-success/20" strokeWidth={2.5} />
                    ) : isOverdue ? (
                      <AlertCircle size={24} className="text-danger fill-danger/20" strokeWidth={2.5} />
                    ) : (
                      <Clock size={24} className="text-blue-400" strokeWidth={2} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a2b4b] font-bold text-sm">{item.medication?.name || "Thuốc"}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                        {scheduledTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {item.medication?.dosage ? `${item.medication.dosage} • ` : ""}{item.medication?.instructions || "Theo chỉ dẫn"}
                    </p>
                  </div>
                </div>

                {/* Right badge / call */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isOverdue ? (
                    <button
                      onClick={onOpenCall}
                      className="bg-danger hover:bg-danger/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1"
                    >
                      <Phone size={12} className="fill-white" />
                      Gọi nhắc
                    </button>
                  ) : isDone ? (
                    <div className="flex items-center gap-1.5">
                      {timingOffset ? (
                        <span className={cn(
                          "text-xs font-black px-2.5 py-1 rounded-lg border",
                          timingOffset.badgeColor === "emerald"
                            ? "text-success bg-green-50 border-green-200"
                            : timingOffset.badgeColor === "rose"
                            ? "text-danger bg-red-50 border-red-200 animate-pulse font-black"
                            : "text-amber-800 bg-amber-50 border-amber-200 font-bold"
                        )}>
                          {timingOffset.label}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-success bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                          Đã uống
                        </span>
                      )}

                      {proofUrl && (
                        <button
                          type="button"
                          onClick={() => setDashboardProofPhoto({ url: proofUrl, medName: item.medication?.name || "Thuốc" })}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 active:scale-95 transition-all cursor-pointer"
                          title="Xem ảnh chụp vỉ thuốc minh chứng"
                        >
                          <Camera size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkDone(item.id)}
                      disabled={markingId === item.id}
                      className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-primary px-2.5 py-1 rounded-lg transition-all active:scale-95"
                      title="Đánh dấu đã uống hộ"
                    >
                      {markingId === item.id ? "Đang lưu..." : "Chờ uống"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. AI Assistant Summary Card */}
      <div 
        onClick={() => onNavigateTab("reports")}
        className="bg-white rounded-3xl p-4 shadow-sm border border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-primary flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-[#1a2b4b] font-bold text-sm">Báo cáo & Phân tích AI</h4>
            <p className="text-gray-500 text-xs mt-0.5">Tỷ lệ tuân thủ tuần này đạt 82%</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400" />
      </div>

      {/* Modal phóng to ảnh minh chứng vỉ thuốc từ Dashboard */}
      {dashboardProofPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                <h4 className="font-black text-sm text-[#1a2b4b]">
                  Ảnh vỉ thuốc: {dashboardProofPhoto.medName}
                </h4>
              </div>
              <button
                onClick={() => setDashboardProofPhoto(null)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center min-h-[300px] max-h-[550px] overflow-hidden">
              <img 
                src={dashboardProofPhoto.url} 
                alt="Minh chứng vỉ thuốc" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="p-3.5 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDashboardProofPhoto(null)}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20 cursor-pointer"
              >
                Đóng ảnh
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
