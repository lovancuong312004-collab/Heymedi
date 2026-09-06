import { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Scan, 
  Phone,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "../lib/utils";
import { useFamily } from "../contexts/FamilyContext";

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
  const { patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Thành viên");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState("Tất cả");

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const lunarString = `(${String(lunar.getDay()).padStart(2, '0')}/${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  const [medsList, setMedsList] = useState([
    {
      id: "1",
      time: "08:00",
      period: "Sáng",
      status: "done",
      name: "Amlodipine 5mg",
      dosage: "1 viên",
      instruction: "Uống sau ăn sáng",
      remainingPills: 14,
      totalPills: 30,
      imgSrc: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&h=100&fit=crop"
    },
    {
      id: "2",
      time: "12:00",
      period: "Trưa",
      status: "overdue",
      name: "Metformin 500mg",
      dosage: "1 viên",
      instruction: "Uống sau ăn trưa",
      remainingPills: 4,
      totalPills: 30,
      imgSrc: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&h=100&fit=crop"
    },
    {
      id: "3",
      time: "20:00",
      period: "Tối",
      status: "future",
      name: "Atorvastatin 10mg",
      dosage: "1 viên",
      instruction: "Uống sau ăn tối",
      remainingPills: 20,
      totalPills: 30,
      imgSrc: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&h=100&fit=crop"
    },
    {
      id: "4",
      time: "22:00",
      period: "Trước ngủ",
      status: "future",
      name: "Vitamin B1",
      dosage: "1 viên",
      instruction: "Uống trước khi ngủ",
      remainingPills: 28,
      totalPills: 30,
      imgSrc: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&h=100&fit=crop"
    }
  ]);

  const filteredMeds = activeFilter === "Tất cả"
    ? medsList
    : medsList.filter((m) => m.period === activeFilter);

  const handleToggleTaken = (id: string) => {
    setMedsList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: item.status === "done" ? "future" : "done" } : item
      )
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Xóa thuốc "${name}" khỏi đơn của ${patientName}?`)) {
      setMedsList((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="p-5 flex flex-col min-h-full bg-[#F4F7FB] animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 relative mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b] w-full text-center">Lịch thuốc {patientName}</h1>
        <button 
          onClick={onOpenAddMed}
          className="absolute right-0 flex items-center gap-1 text-primary font-bold text-sm"
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
                "px-6 py-2.5 rounded-full font-bold text-base whitespace-nowrap transition-colors border-2 shrink-0",
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

      {/* Low Stock Pills Warning */}
      {medsList.some((m) => m.remainingPills <= 5) && (
        <div className="bg-[#FFF0F0] border border-[#FFD6D6] rounded-2xl p-3.5 flex items-center justify-between text-xs mt-3 shadow-sm">
          <div className="flex items-center gap-2 text-danger font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <span>Thuốc <b>Metformin 500mg</b> của {patientName} chỉ còn <b>4 viên</b>!</span>
          </div>
          <button
            onClick={() => alert("Đã thêm thuốc vào danh mục cần mua")}
            className="text-danger font-bold underline shrink-0 ml-2"
          >
            Nhắc mua
          </button>
        </div>
      )}

      {/* Main Timeline Card - Exact layout as MedsScreen */}
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
          <div className="absolute left-[73px] top-10 bottom-12 w-0.5 bg-gray-200" />
          
          {filteredMeds.map((med) => {
            const isDone = med.status === "done";
            const isOverdue = med.status === "overdue";
            const timeColor = isDone ? "text-success" : isOverdue ? "text-danger" : "text-gray-400";

            return (
              <div key={med.id} className="flex items-start gap-4 relative z-10">
                {/* Time & Period */}
                <div className="w-[50px] flex flex-col items-center shrink-0 pt-1">
                  <span className={cn("font-bold text-xl leading-none", timeColor)}>{med.time}</span>
                  <span className={cn("text-xs font-bold mt-1", timeColor)}>{med.period}</span>
                </div>

                {/* Status Icon */}
                <div 
                  onClick={() => handleToggleTaken(med.id)}
                  className="w-6 h-6 shrink-0 bg-[#F4F7FB] flex items-center justify-center rounded-full mt-1 z-10 cursor-pointer"
                  title="Bấm để đánh dấu đã uống"
                >
                  {isDone && <CheckCircle2 className="text-success fill-success/20" size={26} strokeWidth={3} />}
                  {isOverdue && <AlertCircle className="text-danger fill-danger/20" size={26} strokeWidth={3} />}
                  {!isDone && !isOverdue && <Clock className="text-gray-400 fill-gray-100" size={26} strokeWidth={3} />}
                </div>

                {/* Pill Card Content */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                      <img src={med.imgSrc} alt={med.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[#1a2b4b] font-extrabold text-lg leading-tight truncate">
                          {med.name}
                        </span>
                        <button
                          onClick={() => handleDelete(med.id, med.name)}
                          className="text-gray-300 hover:text-danger p-1"
                          title="Xóa thuốc"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <span className="text-gray-600 text-sm mt-1 block">{med.dosage}</span>
                      <span className="text-gray-600 text-sm mt-0.5 block truncate">{med.instruction}</span>
                    </div>
                  </div>

                  {/* Overdue Call Action */}
                  {isOverdue && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-danger">⚠️ Quá giờ chưa thấy uống</span>
                      <button
                        onClick={onOpenCall}
                        className="bg-danger hover:bg-danger/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
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
        </div>
      </div>

      {/* Quét thuốc AI Button - Matches MedsScreen exactly */}
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
