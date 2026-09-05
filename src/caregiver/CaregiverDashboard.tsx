import { useState, useEffect } from "react";
import { 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Scan, 
  Plus, 
  Sparkles,
  ChevronRight,
  Hand
} from "lucide-react";
import ScanLinkModal from "../screens/ScanLinkModal";
import { Lunar } from "lunar-javascript";

interface Props {
  user: any;
  onOpenCall: () => void;
  onOpenScan: () => void;
  onOpenAddMed: () => void;
  onNavigateTab: (tab: string) => void;
}

interface CaregiverMedItem {
  id: string;
  time: string;
  period: string;
  status: string;
  name: string;
  dosage: string;
  instruction: string;
  confirmedAt?: string;
  overdueMins?: number;
}

export default function CaregiverDashboard({
  user,
  onOpenCall,
  onOpenScan,
  onOpenAddMed,
  onNavigateTab
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLinked, setIsLinked] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}`;
  const timeString = `${String(currentDate.getHours()).padStart(2, "0")}:${String(currentDate.getMinutes()).padStart(2, "0")}:${String(currentDate.getSeconds()).padStart(2, "0")}`;
  const lunarString = `(Ngày ${String(lunar.getDay()).padStart(2, "0")} tháng ${String(lunar.getMonth()).padStart(2, "0")} Âm lịch)`;

  const [todayMeds, setTodayMeds] = useState<CaregiverMedItem[]>([
    { id: "1", time: "08:00", period: "Sáng", status: "done", name: "Amlodipine 5mg", dosage: "1 viên", instruction: "Uống sau ăn sáng", confirmedAt: "08:05" },
    { id: "2", time: "12:00", period: "Trưa", status: "overdue", name: "Metformin 500mg", dosage: "1 viên", instruction: "Uống sau ăn trưa", overdueMins: 35 },
    { id: "3", time: "20:00", period: "Tối", status: "future", name: "Atorvastatin 10mg", dosage: "1 viên", instruction: "Uống sau ăn tối" },
    { id: "4", time: "22:00", period: "Trước ngủ", status: "future", name: "Vitamin B1 250mg", dosage: "1 viên", instruction: "Uống trước khi ngủ" }
  ]);

  const completedCount = todayMeds.filter((m) => m.status === "done").length;

  const handleMarkDone = (id: string) => {
    setTodayMeds((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "done", confirmedAt: "Vừa xác nhận" } : item
      )
    );
  };

  if (!isLinked) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full animate-fade-in bg-white m-4 rounded-3xl shadow-sm border border-gray-100 text-center min-h-[70vh]">
        <ScanLinkModal 
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          user={user}
          onLinkSuccess={(name) => {
            setPatientName(name);
            setIsLinked(true);
          }}
        />
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary border-4 border-white shadow-sm">
          <Scan size={40} />
        </div>
        <h2 className="text-[#1a2b4b] font-bold text-2xl mb-2">Chưa có liên kết</h2>
        <p className="text-gray-500 text-sm mb-8 px-4 leading-relaxed">
          Bạn cần liên kết với tài khoản của người bệnh để có thể theo dõi lịch uống thuốc và gửi nhắc nhở.
        </p>
        <button 
          onClick={() => setIsLinkModalOpen(true)}
          className="w-full max-w-[250px] bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> LIÊN KẾT NGAY
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4 h-full animate-fade-in">
      
      {/* 1. Header - Exact prototype styling with Avatar & Name */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face" 
              alt="Avatar Cháu An" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Người chăm sóc,</p>
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-bold text-[#1a2b4b]">{user?.user_metadata?.full_name || "Khách"}</h1>
              <Hand size={18} className="text-amber-400" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Monitored person badge */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" 
              alt={patientName} 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs font-bold text-[#1a2b4b]">{patientName}</span>
        </div>
      </div>

      {/* 2. Lịch hôm nay Card - Exactly like HomeScreen */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EBF1FF] text-primary flex items-center justify-center shrink-0">
            <Calendar size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[#1a2b4b] font-bold text-2xl mb-0.5">{timeString}</h2>
            <p className="text-[#1a2b4b] font-semibold text-base">{dateString}</p>
            <p className="text-gray-500 text-sm mt-0.5">{lunarString}</p>
          </div>
        </div>

        {/* Progress Pill Badge */}
        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-gray-400 block">Đã uống</span>
          <span className="text-base font-extrabold text-primary bg-[#EBF1FF] px-2.5 py-1 rounded-xl">
            {completedCount}/4 cữ
          </span>
        </div>
      </div>

      {/* 3. Hero Card: Thuốc cần nhắc nhở gấp (Quá giờ) */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full border-2 border-danger flex items-center justify-center text-danger">
            <div className="w-1.5 h-1.5 bg-danger rounded-full" />
          </div>
          <h3 className="text-[#1a2b4b] font-bold text-base">Cảnh báo thuốc quá giờ</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 flex flex-col relative overflow-hidden min-h-[220px]">
          <div className="pr-24 relative z-10">
            <p className="text-danger font-bold mb-1.5 text-sm flex items-start gap-1.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span className="leading-tight">12:00 trưa • Quá giờ 35 phút chưa uống!</span>
            </p>
            <h2 className="text-[#1a2b4b] font-black text-[28px] mb-2 leading-tight">
              Metformin 500mg
            </h2>
            <p className="text-gray-700 text-sm font-medium leading-snug">
              1 viên • Uống sau ăn trưa
            </p>
          </div>

          <div className="absolute right-[-12px] top-6 z-0">
            <div className="w-[104px] h-[104px] bg-gray-50 rounded-full shadow-md flex items-center justify-center border-[4px] border-white overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=200&auto=format&fit=crop" 
                alt="Metformin" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="mt-auto pt-6 flex gap-2">
            <button
              onClick={onOpenCall}
              className="flex-1 bg-danger text-white py-4 rounded-2xl font-bold text-lg shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Phone size={20} className="fill-white" />
              GỌI NHẮC {patientName.toUpperCase()}
            </button>
            <button
              onClick={() => handleMarkDone("2")}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              title="Đánh dấu đã uống hộ"
            >
              Đã uống
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Action Row (Matches SOS & AI Scan row from HomeScreen) */}
      <div className="flex gap-3">
        {/* Thêm thuốc nhanh (3/4 width) */}
        <div 
          onClick={onOpenAddMed}
          className="flex-[3] bg-[#EBF1FF] rounded-2xl p-4 flex items-center gap-3 border border-blue-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-11 h-11 bg-primary rounded-xl text-white flex items-center justify-center shadow-sm shrink-0">
            <Plus size={22} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-[#1a2b4b] font-bold text-sm leading-tight">Thêm thuốc cho {patientName}</h3>
            <p className="text-gray-500 text-xs mt-0.5 leading-tight">Cài đặt giờ nhắc & liều lượng</p>
          </div>
        </div>

        {/* Quét AI (1/4 width) */}
        <div 
          onClick={onOpenScan}
          className="flex-[1] bg-[#EBF1FF] rounded-2xl p-2 flex flex-col items-center justify-center border border-blue-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Scan className="text-primary mb-1" size={24} />
          <span className="text-primary font-bold text-[10px] text-center leading-tight">Quét thuốc AI</span>
        </div>
      </div>

      {/* 5. Timeline Today */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-[#1a2b4b] font-bold text-base">Lịch trình hôm nay của {patientName}</h3>
          <button
            onClick={() => onNavigateTab("meds")}
            className="text-primary text-xs font-bold flex items-center gap-0.5 hover:underline"
          >
            Chi tiết <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {todayMeds.map((item) => {
            const isDone = item.status === "done";
            const isOverdue = item.status === "overdue";

            return (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {isDone ? (
                      <CheckCircle2 size={24} className="text-success fill-success/20" strokeWidth={2.5} />
                    ) : isOverdue ? (
                      <AlertCircle size={24} className="text-danger fill-danger/20" strokeWidth={2.5} />
                    ) : (
                      <Clock size={24} className="text-gray-300" strokeWidth={2} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a2b4b] font-bold text-sm">{item.name}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                        {item.period} {item.time}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{item.instruction}</p>
                  </div>
                </div>

                {/* Right badge / call */}
                {isOverdue ? (
                  <button
                    onClick={onOpenCall}
                    className="bg-danger text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm"
                  >
                    Gọi nhắc
                  </button>
                ) : isDone ? (
                  <span className="text-xs font-bold text-success bg-green-50 px-2 py-1 rounded-lg">
                    Đã uống
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-400">Sắp tới</span>
                )}
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

    </div>
  );
}
