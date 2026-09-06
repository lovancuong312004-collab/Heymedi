import { useState } from "react";
import { 
  Sparkles, 
  
  CheckCircle2, 
  Download, 
  Brain
} from "lucide-react";
import { cn } from "../lib/utils";

export default function AIReportScreen() {
  const [timeRange, setTimeRange] = useState<"7days" | "month" | "3months">("7days");
  const [appliedSuggestion, setAppliedSuggestion] = useState(false);

  const weekData = [
    { day: "T2", percent: 100, label: "4/4 cá»¯" },
    { day: "T3", percent: 75, label: "3/4 cá»¯" },
    { day: "T4", percent: 100, label: "4/4 cá»¯" },
    { day: "T5", percent: 50, label: "2/4 cá»¯" },
    { day: "T6", percent: 75, label: "3/4 cá»¯" },
    { day: "T7", percent: 100, label: "4/4 cá»¯" },
    { day: "CN", percent: 75, label: "3/4 cá»¯" }
  ];

  return (
    <div className="p-5 flex flex-col gap-4 min-h-full bg-[#F4F7FB] animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 relative mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b] w-full text-center">BÃ¡o cÃ¡o tuÃ¢n thá»§ AI</h1>
        <button
          onClick={() => alert("Äang xuáº¥t file bÃ¡o cÃ¡o y khoa PDF...")}
          className="absolute right-0 w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          title="Táº£i bÃ¡o cÃ¡o PDF"
        >
          <Download size={17} />
        </button>
      </div>

      {/* Filter Tabs - Prototype style */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
        {[
          { key: "7days", label: "7 ngÃ y qua" },
          { key: "month", label: "ThÃ¡ng nÃ y" },
          { key: "3months", label: "3 thÃ¡ng qua" }
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
              <span className="text-xs font-bold text-gray-400 block uppercase">Äá»™ tuÃ¢n thá»§ cá»§a Ã”ng Minh</span>
              <span className="text-xs font-extrabold text-success bg-[#EAF6ED] px-2 py-0.5 rounded-md border border-green-100">
                Xáº¿p loáº¡i: Ráº¤T Tá»T
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-[#1a2b4b]">Biá»ƒu Ä‘á»“ 7 ngÃ y gáº§n nháº¥t</h3>
          <span className="text-xs text-gray-400 font-medium">Má»¥c tiÃªu: 100%</span>
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
        <h3 className="font-extrabold text-base text-[#1a2b4b]">PhÃ¢n loáº¡i thÃ³i quen uá»‘ng thuá»‘c</h3>
        
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
              <span className="text-[9px] text-gray-400 font-bold">Chuáº©n giá»</span>
            </div>
          </div>

          <div className="space-y-2 text-xs flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-medium text-gray-600">ÄÃºng giá»</span>
              </div>
              <span className="font-bold text-[#1a2b4b]">78% (23 cá»¯)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-gray-600">Uá»‘ng muá»™n</span>
              </div>
              <span className="font-bold text-[#1a2b4b]">12% (3 cá»¯)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="font-medium text-gray-600">Bá» lá»¡</span>
              </div>
              <span className="font-bold text-[#1a2b4b]">10% (2 cá»¯)</span>
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
            <h3 className="font-extrabold text-base text-[#1a2b4b]">Nháº­n Ä‘á»‹nh & Äá» xuáº¥t AI</h3>
            <p className="text-xs text-gray-400 font-medium">PhÃ¢n tÃ­ch hÃ nh vi tá»± Ä‘á»™ng báº±ng mÃ¡y há»c</p>
          </div>
        </div>

        <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 text-xs text-gray-700 leading-relaxed space-y-1.5">
          <p>
            ðŸ” <b>PhÃ¡t hiá»‡n:</b> Cáº£ 2 láº§n bá» lá»¡ vÃ  3 láº§n trá»… giá» Ä‘á»u rÆ¡i vÃ o <b>cá»¯ trÆ°a (12:00)</b> cá»§a thuá»‘c <i>Metformin 500mg</i>. Cá»¯ SÃ¡ng vÃ  Tá»‘i Ä‘áº¡t 100%.
          </p>
          <p>
            ðŸ’¡ <b>Äá» xuáº¥t:</b> Dá»i giá» nháº¯c sang <b>11:30</b> trÆ°á»›c bá»¯a Äƒn trÆ°a Ä‘á»ƒ Ã”ng Minh khÃ´ng bá»‹ quÃªn khi Ä‘i nghá»‰ trÆ°a.
          </p>
        </div>

        <button
          onClick={() => {
            setAppliedSuggestion(true);
            alert("ÄÃ£ tá»± Ä‘á»™ng cáº­p nháº­t cá»¯ thuá»‘c trÆ°a cá»§a Ã”ng Minh thÃ nh 11:30 theo Ä‘á» xuáº¥t AI!");
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
              <CheckCircle2 size={16} /> ÄÃƒ ÃP Dá»¤NG Äá»€ XUáº¤T NÃ€Y
            </>
          ) : (
            <>
              <Sparkles size={16} /> ÃP Dá»¤NG Äá»€ XUáº¤T Cá»¦A AI NGAY
            </>
          )}
        </button>
      </div>

    </div>
  );
}

