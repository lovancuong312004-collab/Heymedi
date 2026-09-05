import { useState } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Download, 
  Brain
} from "lucide-react";
import { cn } from "../lib/utils";

export default function AIReportScreen() {
  const [timeRange, setTimeRange] = useState<"7days" | "month" | "3months">("7days");
  const [appliedSuggestion, setAppliedSuggestion] = useState(false);

  const weekData = [
    { day: "T2", percent: 100, label: "4/4 cữ" },
    { day: "T3", percent: 75, label: "3/4 cữ" },
    { day: "T4", percent: 100, label: "4/4 cữ" },
    { day: "T5", percent: 50, label: "2/4 cữ" },
    { day: "T6", percent: 75, label: "3/4 cữ" },
    { day: "T7", percent: 100, label: "4/4 cữ" },
    { day: "CN", percent: 75, label: "3/4 cữ" }
  ];

  return (
    <div className="p-5 flex flex-col gap-4 min-h-full bg-[#F4F7FB] animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 relative mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b] w-full text-center">Báo cáo tuân thủ AI</h1>
        <button
          onClick={() => alert("Đang xuất file báo cáo y khoa PDF...")}
          className="absolute right-0 w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          title="Tải báo cáo PDF"
        >
          <Download size={17} />
        </button>
      </div>

      {/* Filter Tabs - Prototype style */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
        {[
          { key: "7days", label: "7 ngày qua" },
          { key: "month", label: "Tháng này" },
          { key: "3months", label: "3 tháng qua" }
        ].map((tab) => {
          const isActive = timeRange === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTimeRange(tab.key as any)}
              className={cn(
                "px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 shrink-0",
                isActive
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overall Score Card - Clean White Prototype Style */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF1FF] text-primary flex items-center justify-center font-bold">
              <Brain size={20} />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 block uppercase">Độ tuân thủ của Ông Minh</span>
              <span className="text-xs font-extrabold text-success bg-[#EAF6ED] px-2 py-0.5 rounded-md border border-green-100">
                Xếp loại: RẤT TỐT
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-primary flex items-center gap-0.5 bg-[#EBF1FF] px-2.5 py-1 rounded-full">
            <TrendingUp size={14} /> +7% tuần này
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <h2 className="text-5xl font-black text-[#1a2b4b]">82%</h2>
          <span className="text-gray-500 text-sm font-semibold">tổng số cữ uống đúng</span>
        </div>

        <p className="text-gray-600 text-xs font-medium leading-relaxed">
          AI ghi nhận Ông Minh đã uống đúng lịch <b>23/28 cữ thuốc</b> trong 7 ngày qua.
        </p>

        {/* 3 Metric counters */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
          <div className="bg-[#EAF6ED] rounded-2xl p-2.5 border border-green-100">
            <span className="text-[10px] text-gray-500 block font-semibold">Đúng giờ</span>
            <span className="text-base font-black text-success">23 cữ</span>
          </div>
          <div className="bg-[#FEF3C7] rounded-2xl p-2.5 border border-amber-100">
            <span className="text-[10px] text-gray-500 block font-semibold">Trễ giờ</span>
            <span className="text-base font-black text-amber-700">3 cữ</span>
          </div>
          <div className="bg-[#FFF0F0] rounded-2xl p-2.5 border border-red-100">
            <span className="text-[10px] text-gray-500 block font-semibold">Quên uống</span>
            <span className="text-base font-black text-danger">2 cữ</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-[#1a2b4b]">Biểu đồ 7 ngày gần nhất</h3>
          <span className="text-xs text-gray-400 font-medium">Mục tiêu: 100%</span>
        </div>

        <div className="h-40 w-full flex items-end justify-between pt-4 pb-1 px-1">
          {weekData.map((item, index) => {
            const barHeight = item.percent;
            const isFull = item.percent === 100;
            const isLow = item.percent <= 50;

            return (
              <div key={index} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full flex flex-col items-center justify-end h-28 relative">
                  <div
                    style={{ height: `${barHeight}%` }}
                    className={cn(
                      "w-5 sm:w-6 rounded-t-xl transition-all duration-500 shadow-sm",
                      isFull
                        ? "bg-primary"
                        : isLow
                        ? "bg-danger"
                        : "bg-amber-400"
                    )}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600">{item.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG Donut Chart Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-extrabold text-base text-[#1a2b4b]">Phân loại thói quen uống thuốc</h3>
        
        <div className="flex items-center justify-around gap-4">
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#1A56DB"
                strokeWidth="5"
                strokeDasharray="78 22"
                strokeDashoffset="0"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#F59E0B"
                strokeWidth="5"
                strokeDasharray="12 88"
                strokeDashoffset="-78"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#DC2626"
                strokeWidth="5"
                strokeDasharray="10 90"
                strokeDashoffset="-90"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-[#1a2b4b]">78%</span>
              <span className="text-[9px] text-gray-400 font-bold">Chuẩn giờ</span>
            </div>
          </div>

          <div className="space-y-2 text-xs flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-medium text-gray-600">Đúng giờ</span>
              </div>
              <span className="font-bold text-[#1a2b4b]">78% (23 cữ)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-gray-600">Uống muộn</span>
              </div>
              <span className="font-bold text-[#1a2b4b]">12% (3 cữ)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="font-medium text-gray-600">Bỏ lỡ</span>
              </div>
              <span className="font-bold text-[#1a2b4b]">10% (2 cữ)</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Doctor Insight & Action Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-primary flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#1a2b4b]">Nhận định & Đề xuất AI</h3>
            <p className="text-xs text-gray-400 font-medium">Phân tích hành vi tự động bằng máy học</p>
          </div>
        </div>

        <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 text-xs text-gray-700 leading-relaxed space-y-1.5">
          <p>
            🔍 <b>Phát hiện:</b> Cả 2 lần bỏ lỡ và 3 lần trễ giờ đều rơi vào <b>cữ trưa (12:00)</b> của thuốc <i>Metformin 500mg</i>. Cữ Sáng và Tối đạt 100%.
          </p>
          <p>
            💡 <b>Đề xuất:</b> Dời giờ nhắc sang <b>11:30</b> trước bữa ăn trưa để Ông Minh không bị quên khi đi nghỉ trưa.
          </p>
        </div>

        <button
          onClick={() => {
            setAppliedSuggestion(true);
            alert("Đã tự động cập nhật cữ thuốc trưa của Ông Minh thành 11:30 theo đề xuất AI!");
          }}
          disabled={appliedSuggestion}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(26,86,219,0.25)] transition-all active:scale-95",
            appliedSuggestion
              ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
              : "bg-primary text-white cursor-pointer"
          )}
        >
          {appliedSuggestion ? (
            <>
              <CheckCircle2 size={16} /> ĐÃ ÁP DỤNG ĐỀ XUẤT NÀY
            </>
          ) : (
            <>
              <Sparkles size={16} /> ÁP DỤNG ĐỀ XUẤT CỦA AI NGAY
            </>
          )}
        </button>
      </div>

    </div>
  );
}
