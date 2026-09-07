import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Scan, 
  Phone, 
  Trash2, 
  Loader2, 
  CalendarCheck 
} from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "../lib/utils";
import { useFamily } from "../contexts/FamilyContext";
import { 
  getScheduleByDate, 
  getScheduleDaysSummary, 
  markAsTaken, 
  type Reminder 
} from "../services/medicationService";
import { supabase } from "../lib/supabase";

interface Props {
  onOpenCall: () => void;
  onOpenScan: () => void;
  onOpenAddMed: () => void;
}

export default function CaregiverMedsScreen({
  onOpenCall,
  onOpenScan,
  onOpenAddMed
}: Props) {
  const { linkedPatientId: patientId, patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Người thân");
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [daysSummary, setDaysSummary] = useState<Record<string, { count: number; allTaken: boolean; hasPending: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Dải ngày chọn nhanh (Từ 3 ngày trước đến 10 ngày tới)
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

  const loadData = async () => {
    if (!patientId) {
      setSchedule([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getScheduleByDate(patientId, selectedDate);
      setSchedule(data);

      const start = dateStrip[0];
      const end = dateStrip[dateStrip.length - 1];
      const summary = await getScheduleDaysSummary(patientId, start, end);
      setDaysSummary(summary);
    } catch (err) {
      console.error("Failed to load caregiver meds schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (patientId) {
      const channelName = `caregiver-meds-${patientId}-${Date.now()}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `patient_id=eq.${patientId}` }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `patient_id=eq.${patientId}` }, () => {
          loadData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [patientId, selectedDate]);

  const handleToggleTaken = async (reminderId: string, currentStatus: string) => {
    try {
      setMarkingId(reminderId);
      if (currentStatus !== 'taken') {
        await markAsTaken(reminderId);
      } else {
        await supabase
          .from('reminders')
          .update({ status: 'pending', taken_at: null })
          .eq('id', reminderId);
      }
      await loadData();
    } catch (err) {
      console.error("Failed to update reminder status:", err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleDelete = async (reminderId: string, medName: string) => {
    if (!confirm(`Xóa lịch uống thuốc "${medName}" của ${patientName}?`)) return;
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
      alert("Không thể xóa lịch thuốc. Vui lòng thử lại!");
    }
  };

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

  const filteredMeds = schedule.filter(med => {
    if (activeFilter === "Tất cả") return true;
    const hour = new Date(med.scheduled_time).getHours();
    let period = "Sáng";
    if (hour >= 11 && hour <= 14) period = "Trưa";
    else if (hour > 14 && hour <= 20) period = "Tối";
    else if (hour > 20) period = "Trước ngủ";
    return period === activeFilter;
  });

  const takenCount = schedule.filter(s => s.status === 'taken').length;
  const totalCount = schedule.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 sm:p-5 flex flex-col min-h-full bg-[#F4F7FB] pb-28 select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-3 mt-1">
        <div>
          <h1 className="text-2xl font-black text-[#1a2b4b]">Lịch Thuốc Của Bệnh Nhân</h1>
          <p className="text-xs text-gray-400 font-semibold">Theo dõi & lên lịch lộ trình điều trị cho {patientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenCall}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
            title="Gọi video/thoại cho người bệnh"
          >
            <Phone size={15} />
            <span className="hidden sm:inline">Gọi điện</span>
          </button>
          <button 
            onClick={onOpenScan}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
            title="Quét đơn thuốc bác sĩ bằng AI"
          >
            <Scan size={15} />
            <span className="hidden sm:inline">Quét đơn AI</span>
          </button>
          <button 
            onClick={onOpenAddMed}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-2xl font-bold text-xs shadow-md shadow-primary/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Thêm thuốc</span>
          </button>
        </div>
      </div>

      {/* THANH CHỌN NGÀY TRỰC QUAN CHO NGƯỜI CHĂM SÓC */}
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
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setSelectedDate(today);
              }}
              className="text-xs font-bold text-primary bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Về hôm nay
            </button>
          )}
        </div>

        {/* Dải ngày */}
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
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[58px] py-2.5 px-1 rounded-2xl border-2 transition-all cursor-pointer shrink-0 relative",
                  isSelected 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105" 
                    : "bg-gray-50/80 text-gray-600 border-gray-100 hover:bg-gray-100/70"
                )}
              >
                {todayFlag && (
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full mb-0.5",
                    isSelected ? "bg-white text-primary" : "bg-primary text-white"
                  )}>
                    Hôm nay
                  </span>
                )}

                <span className={cn("text-[11px] font-bold", isSelected ? "text-white/90" : "text-gray-400")}>
                  {dayStr}
                </span>

                <span className={cn("text-lg font-black leading-tight my-0.5", isSelected ? "text-white" : "text-[#1a2b4b]")}>
                  {String(solarNum).padStart(2, '0')}
                </span>

                <span className={cn("text-[9px] font-semibold", isSelected ? "text-white/80" : "text-gray-400")}>
                  Âm {lunarNum}
                </span>

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

      {/* Progress Card của ngày được chọn */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-4 text-white shadow-lg shadow-blue-600/20 mb-3.5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Tiến độ uống thuốc</span>
          <h3 className="text-xl font-black">
            {takenCount} / {totalCount} cữ đã uống
          </h3>
          <p className="text-xs text-blue-100">{formattedSolarDate}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg border border-white/30">
          {progressPercent}%
        </div>
      </div>

      {/* Bộ lọc buổi */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 mb-3 no-scrollbar">
        {["Tất cả", "Sáng", "Trưa", "Tối", "Trước ngủ"].map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <button 
              key={filter} 
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-5 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-colors border-2 shrink-0 active:scale-95 cursor-pointer",
                isActive ? "bg-[#1a2b4b] text-white border-[#1a2b4b] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              )}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Danh sách thuốc */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-4">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-primary" />
            <h3 className="font-extrabold text-[#1a2b4b] text-sm sm:text-base">
              Chi tiết các cữ thuốc ({filteredMeds.length})
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">{formattedLunarDate}</span>
        </div>

        <div className="p-4 flex flex-col gap-3 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-70">
              <Loader2 size={36} className="text-primary animate-spin mb-2" />
              <p className="text-gray-500 font-bold text-sm">Đang tải lịch thuốc...</p>
            </div>
          ) : filteredMeds.length > 0 ? (
            filteredMeds.map((med) => {
              const isDone = med.status === 'taken';
              const d = new Date(med.scheduled_time);
              const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

              return (
                <div 
                  key={med.id} 
                  className={cn(
                    "border-2 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all",
                    isDone ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-gray-200 hover:border-blue-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs shrink-0",
                      isDone ? "bg-emerald-100 text-emerald-800" : "bg-blue-50 text-primary"
                    )}>
                      <span>{timeStr}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm sm:text-base text-[#1a2b4b] leading-tight">
                        {med.medication?.name || "Thuốc"}
                      </span>
                      <span className="text-xs text-primary font-bold mt-0.5">
                        Liều: {med.medication?.dosage || "1 liều"}
                      </span>
                      {med.medication?.instructions && (
                        <span className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                          {med.medication.instructions}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleTaken(med.id, med.status)}
                      disabled={markingId === med.id}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer",
                        isDone 
                          ? "bg-emerald-600 text-white shadow-sm" 
                          : "bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 border border-gray-200"
                      )}
                    >
                      {markingId === med.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      <span>{isDone ? "Đã uống" : "Đánh dấu"}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(med.id, med.medication?.name || "Thuốc")}
                      className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xóa cữ thuốc này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 size={40} className="text-gray-300 mb-2" strokeWidth={1.5} />
              <p className="font-bold text-gray-600 text-sm">Không có cữ thuốc nào trong ngày này</p>
              <p className="text-xs text-gray-400 mt-0.5">Hãy bấm "Thêm thuốc" hoặc "Quét đơn AI" để lên lịch</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
