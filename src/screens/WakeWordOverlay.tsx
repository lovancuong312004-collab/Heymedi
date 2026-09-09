import React, { useEffect, useState } from "react";
import { useWakeWord } from "./useWakeWord"; // Nhớ sửa lại đường dẫn cho đúng nếu file khác thư mục
import { Mic, PhoneCall, AlertOctagon, X } from "lucide-react";
import { cn } from "../lib/utils";

export default function WakeWordOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Gọi bộ não AI lắng nghe ngầm
  const { isListening, lastTranscript } = useWakeWord({
    enabled: true, // Luôn bật
    pauseWhen: isOpen, // Khi giao diện đang mở thì mic tàng hình tạm nghỉ
    onDetected: () => {
      setIsOpen(true); // Tự động BẬT GIAO DIỆN khi nghe chữ "HeyMedi"
      // TODO: Phát ra âm thanh "Ting" nhẹ ở đây nếu muốn
    }
  });

  // Nếu giao diện đang tắt, không hiển thị gì cả (nhưng mic ngầm vẫn chạy)
  if (!isOpen) return null;

  return (
    // Lớp phủ đen mờ đè lên toàn bộ app (z-50)
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Nút tắt thủ công */}
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-8 right-6 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-all"
      >
        <X size={24} />
      </button>

      {/* Nội dung giao diện AI */}
      <div className="w-full bg-gradient-to-b from-[#1a2b4b] to-[#0d172e] rounded-t-3xl p-6 shadow-2xl flex flex-col items-center gap-6 pb-12 animate-in slide-in-from-bottom-full duration-500">
        
        {/* Hiệu ứng Vòng sóng âm (Pulsing Orb) giống Siri/Gemini */}
        <div className="relative flex items-center justify-center mt-[-40px]">
          <div className="absolute w-24 h-24 bg-blue-500 rounded-full animate-ping opacity-30" />
          <div className="absolute w-20 h-20 bg-blue-400 rounded-full animate-pulse opacity-50" />
          <div className="w-16 h-16 bg-blue-600 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.8)] z-10 flex items-center justify-center">
            <Mic size={30} className="text-white animate-bounce" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide">Tôi đang nghe...</h2>
          <p className="text-blue-200/80 text-sm h-6 italic">
            "{lastTranscript || "Hãy nói yêu cầu của bạn..."}"
          </p>
        </div>

        {/* Các nút hành động khẩn cấp theo yêu cầu của bạn */}
        <div className="grid grid-cols-2 gap-4 w-full mt-4">
          <button 
            onClick={() => alert("Đang gọi điện cho Người nhà...")}
            className="flex flex-col items-center justify-center gap-2 bg-white/10 hover:bg-white/20 p-4 rounded-2xl border border-white/5 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
              <PhoneCall size={24} />
            </div>
            <span className="text-white font-bold text-sm">Gọi Người thân</span>
          </button>

          <button 
             onClick={() => alert("Đang phát tín hiệu SOS tới bệnh viện...")}
            className="flex flex-col items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 p-4 rounded-2xl border border-red-500/20 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 flex items-center justify-center mb-1">
              <AlertOctagon size={24} />
            </div>
            <span className="text-red-100 font-bold text-sm text-center">Cấp cứu (SOS)</span>
          </button>
        </div>
        
        <p className="text-gray-400 text-xs mt-2">Nói <b>"Tắt"</b> hoặc bấm dấu X để đóng</p>
      </div>
    </div>
  );
}
