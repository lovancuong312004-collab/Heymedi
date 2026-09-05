import { useState, useEffect } from "react";
import { Calendar, Volume2, Scan, AlertCircle } from "lucide-react";
import { Lunar } from "lunar-javascript";
import SOSModal from "./screens/SOSModal";

interface Props {
  onShowAlert: () => void;
  onLogout: () => void;
}

export default function HomeScreen({ onShowAlert }: Props) {
  const userName = "Ông Minh";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSOSOpen, setIsSOSOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const timeString = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
  const lunarString = `(Ngày ${String(lunar.getDay()).padStart(2, '0')} tháng ${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  return (
    <>
      <SOSModal 
        isOpen={isSOSOpen} 
        onClose={() => setIsSOSOpen(false)} 
        contactName="Cháu An" 
      />
      
      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm shrink-0">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Chào buổi sáng,</p>
            <h1 className="text-lg font-bold text-[#1a2b4b]">{userName} 👋</h1>
          </div>
        </div>

        {/* Date/Time Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#EBF1FF] flex items-center justify-center shrink-0">
              <Calendar size={24} className="text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[#1a2b4b] font-bold text-2xl mb-0.5">{timeString}</h2>
              <p className="text-[#1a2b4b] font-semibold text-base">{dateString}</p>
              <p className="text-gray-500 text-sm mt-0.5">{lunarString}</p>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full bg-[#EBF1FF] flex items-center justify-center shrink-0 active:scale-95 transition-all">
            <Volume2 size={24} className="text-primary" strokeWidth={2.5} />
          </button>
        </div>

        {/* Next Medication */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
            <h3 className="text-[#1a2b4b] font-bold text-base">Thuốc tiếp theo</h3>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden min-h-[220px]">
            <p className="text-primary font-bold mb-2 text-xl">08:00 sáng</p>
            <h2 className="text-[#1a2b4b] font-black text-4xl mb-3 w-[65%] leading-tight">Amlodipine 5mg</h2>
            <p className="text-gray-700 text-lg font-medium w-[65%] leading-snug">1 viên • Uống sau ăn sáng</p>

            <div className="absolute right-[-15px] top-6">
              <div className="w-32 h-32 bg-gray-50 rounded-full shadow-inner border border-gray-100 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=200&auto=format&fit=crop" alt="Ảnh thuốc" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="mt-auto pt-8">
              <button onClick={onShowAlert} className="w-full bg-success text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-green-200 active:scale-[0.98] transition-all tracking-wide">
                ĐẾN GIỜ UỐNG THUỐC
              </button>
            </div>
          </div>
        </div>

        {/* SOS + AI Row */}
        <div className="flex gap-3">
          <div 
            onClick={() => setIsSOSOpen(true)}
            className="flex-[3] bg-[#FFF0F0] rounded-2xl p-4 flex items-center gap-4 border border-[#FFD6D6] shadow-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 bg-danger rounded-xl text-white flex flex-col items-center justify-center shadow-sm shrink-0">
              <AlertCircle size={24} strokeWidth={2.5} />
              <span className="text-[10px] font-bold mt-0.5 leading-none">SOS</span>
            </div>
            <div>
              <h3 className="text-danger font-bold text-base leading-tight">SOS khẩn cấp</h3>
              <p className="text-danger/80 text-sm mt-1 leading-tight">Gọi người thân ngay lập tức</p>
            </div>
          </div>
          <div className="flex-[1] bg-[#EBF1FF] rounded-2xl flex flex-col items-center justify-center border border-blue-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all p-2">
            <Scan className="text-primary mb-1" size={28} />
            <span className="text-primary font-bold text-[11px] text-center leading-tight">Quét AI</span>
          </div>
        </div>
      </div>
    </>
  );
}
