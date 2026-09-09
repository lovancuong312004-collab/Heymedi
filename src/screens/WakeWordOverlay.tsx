import { useState } from "react";
import { useWakeWord } from "../hooks/useWakeWord"; 
import { Mic, PhoneCall, AlertOctagon, X } from "lucide-react";

export default function WakeWordOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Gọi bộ não AI lắng nghe ngầm
  const { lastTranscript } = useWakeWord({
    enabled: true, 
    pauseWhen: isOpen, 
    onDetected: () => setIsOpen(true)
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-10 right-6 p-3 bg-white/20 rounded-full text-white hover:bg-white/40 transition-all cursor-pointer"
      >
        <X size={28} />
      </button>

      <div className="w-full h-[45vh] bg-gradient-to-b from-[#1a2b4b] to-[#050b14] rounded-t-[40px] p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-start pt-16 gap-8 animate-in slide-in-from-bottom-full duration-500 relative border-t border-white/10">
        
        {/* Hiệu ứng Vòng sóng âm */}
        <div className="absolute top-[-50px] flex items-center justify-center">
          <div className="absolute w-32 h-32 bg-blue-500/20 rounded-full animate-ping" />
          <div className="absolute w-24 h-24 bg-blue-400/40 rounded-full animate-pulse" />
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-[0_0_50px_rgba(37,99,235,1)] z-10 flex items-center justify-center border-4 border-[#1a2b4b]">
            <Mic size={36} className="text-white animate-bounce" />
          </div>
        </div>

        <div className="text-center space-y-3 z-10">
          <h2 className="text-3xl font-black text-white tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">Tôi đang nghe...</h2>
          <p className="text-blue-300 text-lg italic font-medium min-h-[30px]">
            {lastTranscript ? `"${lastTranscript}"` : "Hãy nói yêu cầu của bạn..."}
          </p>
        </div>

        <div className="flex gap-6 w-full justify-center mt-4 z-10">
          <button 
            onClick={() => alert("Đang gọi điện cho người nhà...")}
            className="flex flex-col items-center gap-3 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-3xl border border-white/10 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PhoneCall size={28} />
            </div>
            <span className="text-white font-bold text-base">Gọi người nhà</span>
          </button>

          <button 
             onClick={() => alert("Đang phát tín hiệu SOS...")}
            className="flex flex-col items-center gap-3 bg-red-500/10 hover:bg-red-500/20 px-8 py-4 rounded-3xl border border-red-500/20 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center">
              <AlertOctagon size={28} />
            </div>
            <span className="text-red-200 font-bold text-base">Cấp cứu SOS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
