import { useState, useEffect } from "react";
import { Plus, Calendar, CheckCircle2, Clock, Scan, Loader2 } from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "./lib/utils";
import AddMedModal from "./caregiver/AddMedModal";
import ScanAIModal from "./caregiver/ScanAIModal";
import { getTodaySchedule, type Reminder } from "./services/medicationService";

interface Props {
  user: any;
}

export default function MedsScreen({ user }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadSchedule();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await getTodaySchedule(user.id);
      setSchedule(data);
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const lunarString = `(${String(lunar.getDay()).padStart(2, '0')}/${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  const filteredMeds = schedule.filter(med => {
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
      <AddMedModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={() => {
        setIsAddOpen(false);
        loadSchedule();
      }} />
      <ScanAIModal isOpen={isScanOpen} onClose={() => setIsScanOpen(false)} onAddMedSuccess={() => {
        setIsScanOpen(false);
        loadSchedule();
      }} />

      <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB]">
        <div className="flex justify-between items-center mb-4 relative mt-2">
          <h1 className="text-2xl font-bold text-[#1a2b4b] w-full text-center">Thuốc của tôi</h1>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="absolute right-0 flex items-center gap-1 text-primary font-bold text-sm active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={3} />
            Thêm
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 mt-2 no-scrollbar">
          {["Tất cả", "Sáng", "Trưa", "Tối", "Trước ngủ"].map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-full font-bold text-base whitespace-nowrap transition-colors border-2 shrink-0 active:scale-95",
                  isActive ? "bg-primary text-white border-primary shadow-md" : "bg-white text-gray-500 border-gray-200"
                )}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mt-3 mb-4">
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            <div>
              <h2 className="text-[#1a2b4b] font-bold text-lg">Hôm nay - {dateString}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{lunarString}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <Calendar size={20} />
            </div>
          </div>

          <div className="p-5 flex flex-col gap-8 relative min-h-[250px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                <Loader2 size={32} className="text-primary animate-spin mb-2" />
                <p className="text-gray-500">Đang tải lịch thuốc...</p>
              </div>
            ) : filteredMeds.length > 0 ? (
              <>
                <div className="absolute left-[73px] top-10 bottom-12 w-0.5 bg-gray-200" />
                {filteredMeds.map((med) => (
                  <TimelineItem key={med.id} med={med} />
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-70">
                <CheckCircle2 size={48} className="text-gray-300 mb-3" strokeWidth={1.5} />
                <p className="text-gray-500 font-bold text-lg">Không có cữ thuốc nào</p>
                <p className="text-gray-400 text-sm mt-1">Bà/Ông có thể nghỉ ngơi vào buổi {activeTab.toLowerCase()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-2 pb-2">
          <button 
            onClick={() => setIsScanOpen(true)}
            className="w-full bg-[#EBF1FF] rounded-2xl p-5 flex flex-col items-center justify-center border border-[#D1E0FF] cursor-pointer active:scale-95 transition-transform gap-1"
          >
            <div className="flex items-center gap-2 text-primary">
              <Scan size={28} strokeWidth={2.5} />
              <span className="font-extrabold text-xl">QUÉT THUỐC (AI)</span>
            </div>
            <span className="text-[#1a2b4b]/80 text-sm font-semibold mt-1">Quét hộp thuốc để thêm nhanh</span>
          </button>
        </div>
      </div>
    </>
  );
}

function TimelineItem({ med }: { med: Reminder }) {
  const isDone = med.status === "taken";
  const isPending = med.status === "pending";
  const timeColor = isDone ? "text-success" : isPending ? "text-orange-500" : "text-gray-400";
  
  const d = new Date(med.scheduled_time);
  const hour = d.getHours();
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  let periodStr = "Sáng";
  if (hour >= 11 && hour <= 14) periodStr = "Trưa";
  else if (hour > 14 && hour <= 20) periodStr = "Tối";
  else if (hour > 20) periodStr = "Đêm";

  return (
    <div className="flex items-start gap-4 relative z-10">
      <div className="w-[50px] flex flex-col items-center shrink-0 pt-1">
        <span className={cn("font-bold text-xl leading-none", timeColor)}>{timeStr}</span>
        <span className={cn("text-xs font-bold mt-1", timeColor)}>{periodStr}</span>
      </div>
      <div className="w-6 h-6 shrink-0 bg-[#F4F7FB] flex items-center justify-center rounded-full mt-1 z-10">
        {isDone    && <CheckCircle2 className="text-success fill-success/20" size={26} strokeWidth={3} />}
        {isPending && <Clock className="text-orange-500 fill-orange-100" size={26} strokeWidth={3} />}
        {!isDone && !isPending && <Clock className="text-gray-400 fill-gray-100" size={26} strokeWidth={3} />}
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-50 border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
          {med.medication?.image_url ? (
            <img src={med.medication.image_url} alt="Ảnh thuốc" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">💊</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[#1a2b4b] font-extrabold text-lg leading-tight">{med.medication?.name || "Thuốc"}</span>
          <span className="text-gray-600 text-sm mt-1">{med.medication?.dosage}</span>
          <span className="text-gray-600 text-sm mt-0.5">{med.medication?.instructions}</span>
        </div>
      </div>
    </div>
  );
}
