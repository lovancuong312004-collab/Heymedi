import { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Scan, 
  Phone, 
  Trash2, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "../lib/utils";
import { useFamily } from "../contexts/FamilyContext";
import { getTodaySchedule, markAsTaken, type Reminder } from "../services/medicationService";
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
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!patientId) {
      setSchedule([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getTodaySchedule(patientId);
      setSchedule(data);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
          loadData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [patientId]);

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

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const lunarString = `(${String(lunar.getDay()).padStart(2, '0')}/${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  const getPeriodForHour = (hour: number) => {
    if (hour >= 5 && hour < 11) return "Sáng";
    if (hour >= 11 && hour <= 14) return "Trưa";
    if (hour > 14 && hour <= 20) return "Tối";
    return "Trước ngủ";
  };

  const filteredMeds = (schedule || []).filter((med) => {
    if (activeFilter === "Tất cả") return true;
    const hour = new Date(med.scheduled_time).getHours();
    return getPeriodForHour(hour) === activeFilter;
  });

  const hasOverdue = (schedule || []).some(
    (m) => m.status === 'missed' || (m.status === 'pending' && new Date(m.scheduled_time) < new Date())
  );

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB] animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 relative mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b] w-full text-center">Lịch thuốc {patientName}</h1>
        <button 
          onClick={onOpenAddMed}
          className="absolute right-0 flex items-center gap-1 text-primary font-bold text-sm hover:opacity-80 active:scale-95 transition-all"
        >
          <Plus size={18} strokeWidth={3} />
          Thêm thuốc
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 mt-2 no-scrollbar">
        {["Tất cả", "Sáng", "Trưa", "Tối", "Trước ngủ"].map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-6 py-2.5 rounded-full font-bold text-base whitespace-nowrap transition-colors border-2 shrink-0 cursor-pointer",
                isActive 
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/30" 
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Overdue Warning */}
      {hasOverdue && (
        <div className="bg-[#FFF0F0] border border-[#FFD6D6] rounded-2xl p-3.5 flex items-center justify-between text-xs mt-3 shadow-sm">
          <div className="flex items-center gap-2 text-danger font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <span>Có thuốc đã quá giờ mà {patientName} chưa xác nhận uống!</span>
          </div>
          <button
            onClick={onOpenCall}
            className="text-danger font-bold underline shrink-0 ml-2 hover:opacity-80 cursor-pointer"
          >
            Gọi nhắc ngay
          </button>
        </div>
      )}

      {/* Main Timeline Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mt-3 mb-4">
        
        {/* Date Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h2 className="text-[#1a2b4b] font-bold text-lg">Hôm nay - {dateString}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{lunarString}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <Calendar size={20} />
          </div>
        </div>

        {/* Timeline List */}
        <div className="p-5 flex flex-col gap-6 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Đang tải lịch thuốc từ hệ thống...</p>
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clock className="w-10 h-10 mb-2 opacity-40" />
              <p className="font-medium text-sm">
                Chưa có lịch uống thuốc nào {activeFilter !== "Tất cả" ? `buổi ${activeFilter.toLowerCase()}` : "hôm nay"}
              </p>
              <button 
                onClick={onOpenAddMed}
                className="mt-3 text-primary text-sm font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus size={16} /> Thêm lịch thuốc ngay
              </button>
            </div>
          ) : (
            <>
              <div className="absolute left-[73px] top-10 bottom-12 w-0.5 bg-gray-200" />
              
              {filteredMeds.map((med) => {
                const isDone = med.status === "taken";
                const isOverdue = med.status === "missed" || (med.status === "pending" && new Date(med.scheduled_time) < new Date());
                const timeColor = isDone ? "text-success" : isOverdue ? "text-danger" : "text-gray-400";
                
                const medDate = new Date(med.scheduled_time);
                const timeStr = `${String(medDate.getHours()).padStart(2, '0')}:${String(medDate.getMinutes()).padStart(2, '0')}`;
                const period = getPeriodForHour(medDate.getHours());

                const medName = med.medication?.name || "Thuốc không tên";
                const dosage = med.medication?.dosage || "1 viên";
                const instruction = med.medication?.instructions || "Uống sau ăn";
                const imgSrc = med.medication?.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150";
                const isProcessing = markingId === med.id;

                return (
                  <div key={med.id} className="flex items-start gap-4 relative z-10">
                    {/* Time & Period */}
                    <div className="w-[50px] flex flex-col items-center shrink-0 pt-1">
                      <span className={cn("font-bold text-xl leading-none", timeColor)}>{timeStr}</span>
                      <span className={cn("text-xs font-bold mt-1", timeColor)}>{period}</span>
                    </div>

                    {/* Status Icon */}
                    <button 
                      onClick={() => handleToggleTaken(med.id, med.status)}
                      disabled={isProcessing}
                      className="w-6 h-6 shrink-0 bg-[#F4F7FB] flex items-center justify-center rounded-full mt-1 z-10 cursor-pointer active:scale-90 transition-transform"
                      title={isDone ? "Bấm để đánh dấu chưa uống" : "Bấm để đánh dấu đã uống"}
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin text-primary" size={20} />
                      ) : isDone ? (
                        <CheckCircle2 className="text-success fill-success/20" size={26} strokeWidth={3} />
                      ) : isOverdue ? (
                        <AlertCircle className="text-danger fill-danger/20" size={26} strokeWidth={3} />
                      ) : (
                        <Clock className="text-gray-400 fill-gray-100" size={26} strokeWidth={3} />
                      )}
                    </button>

                    {/* Pill Card Content */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                          <img src={imgSrc} alt={medName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[#1a2b4b] font-extrabold text-lg leading-tight truncate">
                              {medName}
                            </span>
                            <button
                              onClick={() => handleDelete(med.id, medName)}
                              className="text-gray-300 hover:text-danger p-1 transition-colors cursor-pointer"
                              title="Xóa lịch thuốc này"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <span className="text-gray-600 text-sm mt-1 block">{dosage}</span>
                          <span className="text-gray-600 text-sm mt-0.5 block truncate">{instruction}</span>
                        </div>
                      </div>

                      {/* Overdue Call Action */}
                      {isOverdue && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-danger">⚠️ Quá giờ chưa thấy uống</span>
                          <button
                            onClick={onOpenCall}
                            className="bg-danger hover:bg-danger/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-transform cursor-pointer"
                          >
                            <Phone size={12} className="fill-white" />
                            Gọi nhắc ngay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Quét thuốc AI Button */}
      <div className="mt-auto pt-2 pb-2">
        <button 
          onClick={onOpenScan}
          className="w-full bg-[#EBF1FF] rounded-2xl p-5 flex flex-col items-center justify-center border border-[#D1E0FF] shadow-[0_4px_14px_rgba(26,86,219,0.1)] cursor-pointer active:scale-95 transition-transform gap-1"
        >
          <div className="flex items-center gap-2 text-primary">
            <Scan size={28} strokeWidth={2.5} />
            <span className="font-extrabold text-xl">QUÉT THUỐC (AI)</span>
          </div>
          <span className="text-[#1a2b4b]/80 text-sm font-semibold mt-1">
            Quét hộp thuốc để thêm nhanh cho {patientName}
          </span>
        </button>
      </div>

    </div>
  );
}
