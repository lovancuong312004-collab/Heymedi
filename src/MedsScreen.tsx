import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Scan, 
  Loader2, 
  ChevronRight,
  Check,
  CalendarCheck
} from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "./lib/utils";
import AddMedModal from "./caregiver/AddMedModal";
import ScanUnknownMedModal from "./screens/ScanUnknownMedModal";
import { 
  getScheduleByDate, 
  getScheduleDaysSummary, 
  markAsTaken, 
  type Reminder 
} from "./services/medicationService";
import { supabase } from "./lib/supabase";

interface Props {
  user: any;
}

export default function MedsScreen({ user }: Props) {
  // Ngày được người dùng bấm chọn trên lịch (Mặc định hôm nay)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  
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
  const formattedLunarDate = `(Ngày ${String(lunar.getDay()).padStart(2, '0')}/${String(lunar.getMonth()).padStart(2, '0')} Âm lịch - ${lunar.getYearInGanZhi()} ${lunar.getMonthInGanZhi()})`;

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
              {filteredMeds.length} cữ thuốc
            </span>
          </div>

          {/* Timeline các cữ thuốc trong ngày */}
          <div className="p-4 sm:p-5 flex flex-col gap-6 relative min-h-[220px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 opacity-70">
                <Loader2 size={36} className="text-primary animate-spin mb-2" />
                <p className="text-gray-500 font-bold text-sm">Đang tải lịch thuốc ngày này...</p>
              </div>
            ) : filteredMeds.length > 0 ? (
              <div className="space-y-4">
                {filteredMeds.map((med) => (
                  <MedItemCard 
                    key={med.id} 
                    med={med} 
                    isTodaySelected={isToday(selectedDate)}
                    onConfirmTaken={() => handleConfirmTaken(med.id)}
                    isMarking={markingId === med.id}
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
    </>
  );
}

function MedItemCard({ 
  med, 
  isTodaySelected, 
  onConfirmTaken,
  isMarking
}: { 
  med: Reminder; 
  isTodaySelected: boolean; 
  onConfirmTaken: () => void;
  isMarking: boolean;
}) {
  const isDone = med.status === "taken";
  
  const d = new Date(med.scheduled_time);
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const hour = d.getHours();
  
  let periodStr = "Sáng";
  if (hour >= 11 && hour <= 14) periodStr = "Trưa";
  else if (hour > 14 && hour <= 20) periodStr = "Tối";
  else if (hour > 20) periodStr = "Đêm";

  return (
    <div className={cn(
      "border-2 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
      isDone 
        ? "bg-emerald-50/60 border-emerald-200" 
        : "bg-white border-gray-200 hover:border-blue-300 shadow-sm"
    )}>
      <div className="flex items-center gap-3.5 flex-1">
        
        {/* Khung giờ & Buổi */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border",
          isDone 
            ? "bg-emerald-100/70 border-emerald-300 text-emerald-800" 
            : "bg-blue-50 border-blue-200 text-primary"
        )}>
          <span className="text-base font-black leading-none">{timeStr}</span>
          <span className="text-[10px] font-bold uppercase mt-1 opacity-80">{periodStr}</span>
        </div>

        {/* Ảnh thuốc */}
        <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
          {med.medication?.image_url ? (
            <img src={med.medication.image_url} alt="Ảnh thuốc" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">💊</span>
          )}
        </div>

        {/* Tên thuốc & Liều & Lộ trình */}
        <div className="flex flex-col">
          <span className="text-[#1a2b4b] font-black text-base sm:text-lg leading-tight">
            {med.medication?.name || "Thuốc"}
          </span>
          <span className="text-primary font-bold text-xs mt-0.5">
            Liều: {med.medication?.dosage || "1 liều"}
          </span>
          {med.medication?.instructions && (
            <span className="text-gray-600 text-xs mt-0.5 font-medium line-clamp-2">
              {med.medication.instructions}
            </span>
          )}
        </div>
      </div>

      {/* Nút hành động hoặc trạng thái */}
      <div className="w-full sm:w-auto flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        {isDone ? (
          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-100/80 px-3 py-1.5 rounded-full font-bold text-xs">
            <Check size={15} strokeWidth={3} />
            <span>Đã uống</span>
          </div>
        ) : isTodaySelected ? (
          <button
            onClick={onConfirmTaken}
            disabled={isMarking}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            {isMarking ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
            <span>Tôi đã uống</span>
          </button>
        ) : (
          <span className="text-gray-400 text-xs font-semibold bg-gray-100 px-3 py-1.5 rounded-full">
            Lịch dự kiến
          </span>
        )}
      </div>
    </div>
  );
}
