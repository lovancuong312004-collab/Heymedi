import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Scan, 
  Loader2, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check, 
  CalendarCheck,
  Camera,
  Volume2,
  X,
  AlertCircle
} from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "./lib/utils";
import AddMedModal from "./caregiver/AddMedModal";
import ScanUnknownMedModal from "./screens/ScanUnknownMedModal";
import ElderlyCameraCaptureModal from "./components/ElderlyCameraCaptureModal";
import { cleanMedicineTitle } from "./utils/geminiVision";
import { speakVietnamese } from "./utils/voiceAssistant";
import { 
  getScheduleByDate, 
  getScheduleDaysSummary, 
  markAsTaken, 
  uploadPillProofImage,
  type Reminder 
} from "./services/medicationService";
import { supabase } from "./lib/supabase";

interface Props {
  user: any;
}

export interface DoseSessionGroup {
  timeStr: string;
  mealLabel: string;
  scheduled_time: string;
  items: Reminder[];
  isAllTaken: boolean;
  takenCount: number;
}

export default function MedsScreen({ user }: Props) {
  // Ngày được người dùng bấm chọn trên lịch (Mặc định hôm nay)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [photoCaptureSession, setPhotoCaptureSession] = useState<DoseSessionGroup | null>(null);
  const [viewingMedPhoto, setViewingMedPhoto] = useState<{ name: string; imageUrl?: string | null; dosage?: string; instruction?: string } | null>(null);
  
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [daysSummary, setDaysSummary] = useState<Record<string, { count: number; allTaken: boolean; hasPending: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Khởi tạo dải ngày trong tuần (Từ 3 ngày trước đến 10 ngày tới)
  const dateStrip = useMemo(() => {
    const list: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = -3; i <= 10; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const loadScheduleForSelectedDate = async (targetDate: Date) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await getScheduleByDate(user.id, targetDate);
      setSchedule(data);
    } catch (error) {
      console.error("Failed to load schedule for date:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDaysSummary = async () => {
    if (!user?.id) return;
    try {
      const start = dateStrip[0];
      const end = dateStrip[dateStrip.length - 1];
      const summary = await getScheduleDaysSummary(user.id, start, end);
      setDaysSummary(summary);
    } catch (err) {
      console.error("Failed to load days summary:", err);
    }
  };

  useEffect(() => {
    loadScheduleForSelectedDate(selectedDate);
    loadDaysSummary();

    if (user?.id) {
      const channel = supabase.channel(`elderly-meds-watch-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `patient_id=eq.${user.id}` }, () => {
          loadScheduleForSelectedDate(selectedDate);
          loadDaysSummary();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `patient_id=eq.${user.id}` }, () => {
          loadScheduleForSelectedDate(selectedDate);
          loadDaysSummary();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, selectedDate]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleJumpToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  };

  // Xác nhận uống một viên thuốc đơn lẻ
  const handleConfirmTaken = async (reminderId: string) => {
    try {
      setMarkingId(reminderId);
      await markAsTaken(reminderId);
      await loadScheduleForSelectedDate(selectedDate);
      await loadDaysSummary();
    } catch (err) {
      console.error("Failed to mark taken:", err);
    } finally {
      setMarkingId(null);
    }
  };

  // Xác nhận uống toàn bộ cữ thuốc
  const handleConfirmSessionTaken = async (session: DoseSessionGroup) => {
    try {
      const pendingItems = session.items.filter(i => i.status !== 'taken');
      for (const item of pendingItems) {
        setMarkingId(item.id);
        await markAsTaken(item.id);
      }
      await loadScheduleForSelectedDate(selectedDate);
      await loadDaysSummary();
    } catch (err) {
      console.error("Failed to mark session taken:", err);
    } finally {
      setMarkingId(null);
    }
  };

  // Hoàn tất chụp ảnh minh chứng cho cả cữ thuốc
  const handleCaptureSessionComplete = async (blob: Blob) => {
    if (!photoCaptureSession) return;
    try {
      const pendingItems = photoCaptureSession.items.filter(i => i.status !== 'taken');
      const targetItems = pendingItems.length > 0 ? pendingItems : photoCaptureSession.items;
      const firstId = targetItems[0]?.id || "session";

      setMarkingId(firstId);
      const uploadedUrl = await uploadPillProofImage(blob, firstId);

      for (const item of targetItems) {
        await markAsTaken(item.id, uploadedUrl);
      }

      const allNames = targetItems.map(m => cleanMedicineTitle(m.medication?.name || "Thuốc")).join(", ");
      const allDosages = targetItems.map(m => m.medication?.dosage || "1 liều").join(", ");

      // Broadcast sang người chăm sóc
      const nowIso = new Date().toISOString();
      const channel = supabase.channel('sos-emergency-alerts');
      await channel.send({
        type: 'broadcast',
        event: 'PILL_TAKEN_PROOF',
        payload: {
          patient_id: user?.id,
          patient_name: user?.user_metadata?.full_name || "Bác",
          reminder_id: firstId,
          reminder_ids: targetItems.map(m => m.id),
          session_time: photoCaptureSession.timeStr,
          med_name: allNames,
          dosage: allDosages,
          photo_url: uploadedUrl,
          scheduled_time: photoCaptureSession.scheduled_time || nowIso,
          taken_at: nowIso,
          timestamp: nowIso
        }
      });

      await loadScheduleForSelectedDate(selectedDate);
      await loadDaysSummary();
      setPhotoCaptureSession(null);
    } catch (err) {
      console.error("Lỗi xác nhận cữ kèm ảnh:", err);
    } finally {
      setMarkingId(null);
    }
  };

  // Tính toán nhãn ngày
  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const lunar = Lunar.fromDate(selectedDate);
  const dayOfWeekNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = dayOfWeekNames[selectedDate.getDay()];
  const formattedSolarDate = `${dayName}, ${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`;
  const formattedLunarDate = `(Ngày ${String(lunar.getDay()).padStart(2, '0')}/${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  // Lọc theo cữ buổi
  const filteredMeds = (schedule || []).filter(med => {
    if (activeTab === "Tất cả") return true;
    const hour = new Date(med.scheduled_time).getHours();
    let period = "Sáng";
    if (hour >= 11 && hour <= 14) period = "Trưa";
    else if (hour > 14 && hour <= 20) period = "Tối";
    else if (hour > 20) period = "Trước ngủ";
    return period === activeTab;
  });

  // Gom nhóm các thuốc cùng giờ thành các Cữ thuốc (Dose Sessions)
  const doseSessions = useMemo<DoseSessionGroup[]>(() => {
    const map = new Map<string, Reminder[]>();
    filteredMeds.forEach(r => {
      const d = new Date(r.scheduled_time);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (!map.has(timeStr)) {
        map.set(timeStr, []);
      }
      map.get(timeStr)!.push(r);
    });

    const groups: DoseSessionGroup[] = [];
    map.forEach((items, timeStr) => {
      const hourVal = parseInt(timeStr.split(':')[0], 10);
      const meal = hourVal < 11 ? "Cữ Sáng (Sau ăn)" : hourVal < 15 ? "Cữ Trưa (Sau ăn)" : hourVal < 20 ? "Cữ Tối (Sau ăn)" : "Cữ Trước Ngủ";
      const takenCount = items.filter(i => i.status === 'taken').length;
      groups.push({
        timeStr,
        mealLabel: meal,
        scheduled_time: items[0].scheduled_time,
        items,
        isAllTaken: takenCount === items.length,
        takenCount
      });
    });

    groups.sort((a, b) => a.timeStr.localeCompare(b.timeStr));
    return groups;
  }, [filteredMeds]);

  return (
    <>
      <AddMedModal 
        isOpen={isAddOpen} 
        patientId={user?.id} 
        onClose={() => setIsAddOpen(false)} 
        onAdd={() => {
          setIsAddOpen(false);
          loadScheduleForSelectedDate(selectedDate);
          loadDaysSummary();
        }} 
      />

      <ScanUnknownMedModal 
        isOpen={isScanOpen} 
        onClose={() => setIsScanOpen(false)} 
        user={user}
        currentSchedule={schedule}
        onAddedMed={() => {
          loadScheduleForSelectedDate(selectedDate);
          loadDaysSummary();
        }} 
      />

      {/* Modal Camera chụp ảnh minh chứng cữ thuốc cho người già */}
      <ElderlyCameraCaptureModal 
        isOpen={!!photoCaptureSession}
        onClose={() => setPhotoCaptureSession(null)}
        title={`Chụp Ảnh Cữ ${photoCaptureSession?.timeStr || ""}`}
        subtitle={`Chụp các viên thuốc cữ ${photoCaptureSession?.mealLabel || ""} để gửi cho con`}
        guideText="ĐẶT CÁC VIÊN THUỐC TRÊN TAY HOẶC VỈ THUỐC VÀO KHUNG HÌNH"
        onCaptureComplete={handleCaptureSessionComplete}
      />

      <div className="p-4 sm:p-5 flex flex-col min-h-full bg-[#F4F7FB] pb-28 select-none">
        
        {/* Top Header */}
        <div className="flex justify-between items-center mb-3 mt-1">
          <div>
            <h1 className="text-2xl font-black text-[#1a2b4b]">Lịch Thuốc Của Bác</h1>
            <p className="text-xs text-gray-500 font-semibold">Theo dõi cữ thuốc theo từng ngày & lộ trình</p>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-2xl font-bold text-xs shadow-md shadow-primary/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Thêm thuốc</span>
          </button>
        </div>

        {/* THANH LỊCH CHỌN NGÀY TRỰC QUAN (HORIZONTAL DATE CAROUSEL) */}
        <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100 mb-3.5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-primary" />
              <span className="text-sm font-black text-[#1a2b4b]">
                Tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
              </span>
            </div>

            {!isToday(selectedDate) && (
              <button
                onClick={handleJumpToToday}
                className="text-xs font-bold text-primary bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                Về hôm nay
              </button>
            )}
          </div>

          {/* Dải các ngày bấm chọn */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {dateStrip.map((d) => {
              const isSelected = isSameDay(d, selectedDate);
              const todayFlag = isToday(d);
              const dayStr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
              const solarNum = d.getDate();
              const lunarObj = Lunar.fromDate(d);
              const lunarNum = lunarObj.getDay();

              const dateKey = d.toISOString().split('T')[0];
              const dayInfo = daysSummary[dateKey];

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => handleSelectDate(d)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[58px] py-2.5 px-1 rounded-2xl border-2 transition-all cursor-pointer shrink-0 relative",
                    isSelected 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105" 
                      : "bg-gray-50/80 text-gray-600 border-gray-100 hover:bg-gray-100/70"
                  )}
                >
                  {/* Nhãn hôm nay */}
                  {todayFlag && (
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full mb-0.5",
                      isSelected ? "bg-white text-primary" : "bg-primary text-white"
                    )}>
                      Hôm nay
                    </span>
                  )}

                  {/* Thứ */}
                  <span className={cn(
                    "text-[11px] font-bold",
                    isSelected ? "text-white/90" : "text-gray-400"
                  )}>
                    {dayStr}
                  </span>

                  {/* Ngày Dương Lịch To Rõ */}
                  <span className={cn(
                    "text-lg font-black leading-tight my-0.5",
                    isSelected ? "text-white" : "text-[#1a2b4b]"
                  )}>
                    {String(solarNum).padStart(2, '0')}
                  </span>

                  {/* Ngày Âm Lịch */}
                  <span className={cn(
                    "text-[9px] font-semibold",
                    isSelected ? "text-white/80" : "text-gray-400"
                  )}>
                    Âm {lunarNum}
                  </span>

                  {/* Chấm tròn báo hiệu thuốc */}
                  {dayInfo && dayInfo.count > 0 && (
                    <div className="absolute -bottom-1 flex items-center justify-center">
                      <span className={cn(
                        "w-2 h-2 rounded-full ring-2 ring-white",
                        dayInfo.allTaken ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                      )} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Lọc Buổi (Sáng, Trưa, Tối...) */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 mb-3 no-scrollbar">
          {["Tất cả", "Sáng", "Trưa", "Tối", "Trước ngủ"].map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-colors border-2 shrink-0 active:scale-95 cursor-pointer",
                  isActive ? "bg-[#1a2b4b] text-white border-[#1a2b4b] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* KHUNG HIỂN THỊ DANH SÁCH THUỐC CỦA NGÀY ĐƯỢC CHỌN */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-4">
          
          {/* Header ngày được chọn */}
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck size={18} className="text-primary" />
                <h2 className="text-[#1a2b4b] font-black text-base sm:text-lg">
                  {formattedSolarDate}
                </h2>
              </div>
              <p className="text-gray-500 text-xs mt-0.5 font-medium">{formattedLunarDate}</p>
            </div>
            
            <span className="text-xs font-bold bg-white text-primary px-3 py-1 rounded-full border border-blue-200 shadow-sm shrink-0">
              {doseSessions.length} cữ ({filteredMeds.length} thuốc)
            </span>
          </div>

          {/* Timeline các cữ thuốc trong ngày */}
          <div className="p-4 sm:p-5 flex flex-col gap-4 relative min-h-[220px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 opacity-70">
                <Loader2 size={36} className="text-primary animate-spin mb-2" />
                <p className="text-gray-500 font-bold text-sm">Đang tải lịch thuốc ngày này...</p>
              </div>
            ) : doseSessions.length > 0 ? (
              <div className="space-y-4">
                {doseSessions.map((session) => (
                  <DoseSessionCard 
                    key={session.timeStr} 
                    session={session} 
                    isTodaySelected={isToday(selectedDate)}
                    onConfirmSessionTaken={() => handleConfirmSessionTaken(session)}
                    onTakeSessionPhoto={() => setPhotoCaptureSession(session)}
                    onConfirmSingleMed={(medId) => handleConfirmTaken(medId)}
                    onViewMedPhoto={(med) => setViewingMedPhoto(med)}
                    isMarkingId={markingId}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                  <CheckCircle2 size={36} strokeWidth={2} />
                </div>
                <p className="text-gray-700 font-black text-lg">Không có cữ thuốc nào</p>
                <p className="text-gray-400 text-xs mt-1 max-w-xs">
                  Bác không có lịch uống thuốc trong ngày này. Chúc bác một ngày thảnh thơi và nhiều sức khỏe!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nút Quét thuốc ngoài đơn bằng AI */}
        <div className="mt-auto">
          <button 
            onClick={() => setIsScanOpen(true)}
            className="w-full bg-[#EBF1FF] hover:bg-[#E0EBFF] rounded-2xl p-4 flex items-center justify-between border border-[#D1E0FF] shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <Scan size={24} />
              </div>
              <div className="text-left">
                <span className="font-black text-sm sm:text-base text-[#1a2b4b] block">QUÉT THUỐC NGOÀI ĐƠN (AI)</span>
                <span className="text-xs text-gray-500 font-medium block">Kiểm tra tương tác thuốc & an toàn bệnh nền</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-primary shrink-0" />
          </button>
        </div>

      </div>

      {/* POPUP PHÓNG TO XEM RÕ ẢNH VỈ THUỐC CHO NGƯỜI GIÀ */}
      {viewingMedPhoto && (
        <div 
          onClick={() => setViewingMedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] animate-slide-up cursor-default"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
                  Mặt vỉ thuốc thực tế
                </span>
                <h3 className="text-lg font-black text-[#1a2b4b]">
                  {viewingMedPhoto.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingMedPhoto(null)}
                className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center min-h-[250px] max-h-[500px] overflow-hidden">
              {viewingMedPhoto.imageUrl ? (
                <img 
                  src={viewingMedPhoto.imageUrl} 
                  alt={viewingMedPhoto.name} 
                  className="w-full h-full object-contain rounded-xl max-h-[480px]"
                />
              ) : (
                <div className="text-center text-white/70 py-10 space-y-2">
                  <span className="text-6xl block">💊</span>
                  <p className="text-xs">Chưa có ảnh vỉ thuốc thực tế trong hệ thống.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Liều lượng:</span>
                <span className="text-xs font-black text-primary bg-blue-50 px-2.5 py-1 rounded-lg">
                  {viewingMedPhoto.dosage || "1 viên"}
                </span>
              </div>
              {viewingMedPhoto.instruction && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Cách dùng:</span>
                  <span className="text-xs font-bold text-gray-800">
                    {viewingMedPhoto.instruction.split('|')[0]}
                  </span>
                </div>
              )}
              <button
                onClick={() => setViewingMedPhoto(null)}
                className="w-full mt-2 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/25 cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function getSessionTimeTheme(timeStr: string) {
  const hour = parseInt(timeStr.split(':')[0], 10) || 8;
  if (hour < 11) {
    return {
      period: 'SÁNG',
      icon: '🌅',
      timeBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/20',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      activeBorder: 'border-amber-300 hover:border-amber-400',
      gradientBg: 'from-amber-500/10 via-orange-500/5 to-transparent',
      chipBg: 'bg-amber-100/80 text-amber-900'
    };
  } else if (hour < 15) {
    return {
      period: 'TRƯA',
      icon: '☀️',
      timeBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-blue-500/20',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
      activeBorder: 'border-sky-300 hover:border-sky-400',
      gradientBg: 'from-sky-500/10 via-blue-500/5 to-transparent',
      chipBg: 'bg-sky-100/80 text-sky-900'
    };
  } else if (hour < 21) {
    return {
      period: 'TỐI',
      icon: '🌇',
      timeBg: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20',
      badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      activeBorder: 'border-indigo-300 hover:border-indigo-400',
      gradientBg: 'from-indigo-500/10 via-purple-500/5 to-transparent',
      chipBg: 'bg-indigo-100/80 text-indigo-900'
    };
  } else {
    return {
      period: 'ĐÊM',
      icon: '🌙',
      timeBg: 'bg-gradient-to-br from-purple-700 to-slate-800 text-white shadow-purple-900/20',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      activeBorder: 'border-purple-300 hover:border-purple-400',
      gradientBg: 'from-purple-500/10 via-slate-500/5 to-transparent',
      chipBg: 'bg-purple-100/80 text-purple-900'
    };
  }
}

function DoseSessionCard({
  session,
  isTodaySelected,
  onConfirmSessionTaken,
  onTakeSessionPhoto,
  onConfirmSingleMed,
  onViewMedPhoto,
  isMarkingId
}: {
  session: DoseSessionGroup;
  isTodaySelected: boolean;
  onConfirmSessionTaken: () => void;
  onTakeSessionPhoto: () => void;
  onConfirmSingleMed: (medId: string) => void;
  onViewMedPhoto?: (med: { name: string; imageUrl?: string | null; dosage?: string; instruction?: string }) => void;
  isMarkingId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(!session.isAllTaken);
  const isDone = session.isAllTaken;
  const theme = getSessionTimeTheme(session.timeStr);

  const isOverdue = useMemo(() => {
    if (isDone || !isTodaySelected) return false;
    const [h, m] = session.timeStr.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(h, m, 0, 0);
    return now.getTime() - scheduledTime.getTime() > 15 * 60000;
  }, [isDone, isTodaySelected, session.timeStr]);

  const handleSpeakSession = () => {
    const cleanNames = session.items.map(m => cleanMedicineTitle(m.medication?.name || "Thuốc")).join(", ");
    speakVietnamese(`Đến ${session.mealLabel} lúc ${session.timeStr}. Cữ này gồm ${session.items.length} loại thuốc: ${cleanNames}. Bác nhớ kiểm tra đủ thuốc rồi uống nhé!`);
  };

  const handleSpeakPill = (med: Reminder) => {
    const cleanName = cleanMedicineTitle(med.medication?.name || "Thuốc");
    speakVietnamese(`Thuốc ${cleanName}, liều lượng ${med.medication?.dosage || "1 liều"}, ${med.medication?.instructions?.split('|')[0]?.trim() || "uống theo đơn"}.`);
  };

  return (
    <div className={cn(
      "border-2 rounded-3xl overflow-hidden transition-all shadow-xs",
      isDone 
        ? "bg-emerald-50/40 border-emerald-300/80" 
        : isOverdue
          ? "bg-rose-50/40 border-rose-300 hover:border-rose-400"
          : `bg-white ${theme.activeBorder}`
    )}>
      {/* Header cữ thuốc (Bấm vào để mở rộng / thu gọn) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none bg-gradient-to-r",
          isDone 
            ? "from-emerald-500/10 to-transparent" 
            : isOverdue 
              ? "from-rose-500/10 to-transparent" 
              : theme.gradientBg
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-xs",
            isDone 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20" 
              : isOverdue
                ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-red-500/20"
                : `${theme.timeBg} shadow-sm`
          )}>
            <span className="text-base font-black leading-tight">{session.timeStr}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-0.5">
              <span>{theme.icon}</span>
              <span>{theme.period}</span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-black text-[#1a2b4b] truncate">{session.mealLabel}</h3>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0", theme.chipBg)}>
                {session.items.length} loại thuốc
              </span>
            </div>
            
            {/* Tóm tắt các tên thuốc ngắn gọn */}
            <p className="text-xs text-gray-600 font-semibold truncate">
              {session.items.map(m => cleanMedicineTitle(m.medication?.name || "Thuốc")).join(" • ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isDone ? (
            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              <CheckCircle2 size={13} className="text-emerald-700" />
              <span>Đã uống đủ</span>
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-300 animate-pulse">
              <AlertCircle size={13} className="text-rose-600" />
              <span>Quá giờ</span>
            </span>
          ) : (
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", theme.badgeBg)}>
              {session.takenCount}/{session.items.length} đã uống
            </span>
          )}

          <div className="text-gray-400 p-1">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Nội dung danh sách thuốc khi mở rộng */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-gray-100 animate-fade-in">
          
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Danh sách thuốc trong cữ:
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSpeakSession();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 active:scale-95 transition-all cursor-pointer"
            >
              <Volume2 size={13} />
              <span>AI đọc cả cữ</span>
            </button>
          </div>

          <div className="space-y-2">
            {session.items.map((med) => {
              const medDone = med.status === 'taken';
              const cleanName = cleanMedicineTitle(med.medication?.name || "Thuốc");
              const isMarking = isMarkingId === med.id;

              return (
                <div 
                  key={med.id}
                  className={cn(
                    "p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all",
                    medDone 
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" 
                      : "bg-gray-50/80 border-gray-200 text-[#1a2b4b]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div 
                      onClick={() => onViewMedPhoto?.({ 
                        name: cleanName, 
                        imageUrl: med.medication?.image_url, 
                        dosage: med.medication?.dosage, 
                        instruction: med.medication?.instructions 
                      })}
                      className="w-12 h-12 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs cursor-pointer hover:border-primary active:scale-95 transition-all group relative"
                      title="Chạm để phóng to xem rõ ảnh vỉ thuốc"
                    >
                      {med.medication?.image_url ? (
                        <>
                          <img src={med.medication.image_url} alt={cleanName} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] transition-opacity font-bold">
                            🔍
                          </div>
                        </>
                      ) : (
                        <span className="text-xl">💊</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 
                          onClick={() => onViewMedPhoto?.({ 
                            name: cleanName, 
                            imageUrl: med.medication?.image_url, 
                            dosage: med.medication?.dosage, 
                            instruction: med.medication?.instructions 
                          })}
                          className="font-black text-sm truncate cursor-pointer hover:text-primary transition-colors"
                          title="Bấm để xem rõ thuốc"
                        >
                          {cleanName}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleSpeakPill(med)}
                          className="text-primary hover:text-blue-700 p-0.5 active:scale-90 transition-transform cursor-pointer"
                          title="Bấm để nghe AI đọc"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-primary truncate">
                        {med.medication?.dosage || "1 viên"} 
                        {med.medication?.instructions && (
                          <span className="text-gray-500 font-medium"> • {med.medication.instructions.split('|')[0]}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Nút uống viên đơn lẻ */}
                  {medDone ? (
                    <span className="text-emerald-700 bg-white border border-emerald-300 font-black text-[11px] px-2.5 py-1 rounded-xl shrink-0 flex items-center gap-1">
                      <Check size={12} strokeWidth={3} />
                      <span>Đã uống</span>
                    </span>
                  ) : isTodaySelected ? (
                    <button
                      onClick={() => onConfirmSingleMed(med.id)}
                      disabled={isMarking}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {isMarking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                      <span>Uống viên này</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* HÀNG NÚT THAO TÁC CẢ CỮ (NẾU CÒN THUỐC CHƯA UỐNG) */}
          {!isDone && isTodaySelected && (
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onTakeSessionPhoto}
                className="flex-1 bg-[#1C4ED8] hover:bg-blue-700 text-white py-3 px-3 rounded-2xl font-black text-xs shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border-b-2 border-blue-900"
              >
                <Camera size={16} />
                <span>📸 UỐNG CẢ CỮ + CHỤP ẢNH GỬI CON</span>
              </button>

              <button
                onClick={onConfirmSessionTaken}
                className="flex-1 bg-[#18A048] hover:bg-emerald-700 text-white py-3 px-3 rounded-2xl font-black text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border-b-2 border-emerald-900 uppercase tracking-wide"
              >
                <Check size={16} strokeWidth={3} />
                <span>TÔI ĐÃ UỐNG ĐỦ CỮ NÀY</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
