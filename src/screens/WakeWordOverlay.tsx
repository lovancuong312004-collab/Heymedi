import { useState, useEffect, useRef } from "react";
import { useWakeWord } from "../hooks/useWakeWord"; 
import { Mic, X, Loader2 } from "lucide-react";

export default function WakeWordOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [aiState, setAiState] = useState<"greeting" | "listening" | "processing" | "acting">("listening");
  const [aiMessage, setAiMessage] = useState("Dạ, cháu nghe đây ạ...");
  
  const { lastTranscript, restartManually } = useWakeWord({
    enabled: true, 
    pauseWhen: isOpen, 
    onDetected: () => {
      setIsOpen(true);
      setAiState("greeting");
    }
  });

  // Hàm để AI phát ra âm thanh (Nói tiếng Việt)
  const speak = (text: string, callback?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Hủy giọng nói cũ nếu đang nói dở
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.1; // Tốc độ nói
      utterance.pitch = 1.2; // Giọng hơi thanh (giống nữ)
      utterance.onend = () => { if(callback) callback(); };
      window.speechSynthesis.speak(utterance);
    }
  };

  // Xử lý khi vừa mở màn hình lên
  useEffect(() => {
    if (isOpen) {
      setAiMessage("Dạ, cháu chào bác. Bác cần giúp gì ạ?");
      speak("Dạ, cháu chào bác. Bác cần giúp gì ạ?", () => {
        setAiState("listening");
        restartManually(); // Mở lại mic để nghe lệnh tiếp theo
      });
    } else {
      window.speechSynthesis.cancel();
    }
  }, [isOpen, restartManually]);

  // BỘ NÃO PHÂN TÍCH LỆNH (Ý định của người dùng)
  useEffect(() => {
    if (!isOpen || aiState !== "listening" || !lastTranscript) return;

    const text = lastTranscript.toLowerCase();
    console.log("Người dùng nói:", text);

    // 1. Kịch bản KHẨN CẤP (SOS)
    if (text.includes("cứu") || text.includes("mệt") || text.includes("đau") || text.includes("khó thở") || text.includes("gọi người nhà")) {
      setAiState("processing");
      setAiMessage(`"${lastTranscript}"`);
      
      setTimeout(() => {
        setAiState("acting");
        setAiMessage("Đang phát tín hiệu khẩn cấp tới người nhà...");
        speak("Bác bình tĩnh nhé. Cháu đang gọi báo động khẩn cấp cho người nhà ngay đây ạ!", () => {
          // Thực thi hàm gọi SOS ở đây (hiện tại để alert demo)
          alert("🚨 HỆ THỐNG ĐANG GỌI CHO NGƯỜI NHÀ VÀ BỆNH VIỆN!");
          setIsOpen(false);
        });
      }, 1000);
      return;
    }

    // 2. Kịch bản HỎI THUỐC
    if (text.includes("thuốc") || text.includes("uống gì") || text.includes("giờ nào")) {
      setAiState("processing");
      setAiMessage(`"${lastTranscript}"`);
      
      setTimeout(() => {
        setAiState("acting");
        setAiMessage("Đang mở lịch trình dùng thuốc...");
        speak("Dạ, hệ thống đang mở lịch trình uống thuốc chi tiết hôm nay cho bác xem nhé.", () => {
          alert("💊 CHUYỂN HƯỚNG SANG MÀN HÌNH LỊCH THUỐC!");
          setIsOpen(false);
        });
      }, 1000);
      return;
    }

    // 3. Kịch bản ĐÓNG/TẮT
    if (text.includes("tắt") || text.includes("thôi") || text.includes("đóng") || text.includes("không có gì")) {
      setAiState("processing");
      speak("Dạ vâng, cháu xin phép tắt ạ. Bác cần gì cứ gọi Hey Medi nhé.", () => {
        setIsOpen(false);
      });
      return;
    }

    // Nếu AI không hiểu lệnh, tiếp tục lắng nghe
    if (text.trim() !== "" && !text.includes("hey")) {
       setAiMessage(`"${lastTranscript}"`);
    }

  }, [lastTranscript, isOpen, aiState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-12 right-6 p-3 bg-white/10 rounded-full text-white/50 hover:bg-white/20 hover:text-white transition-all cursor-pointer z-50"
      >
        <X size={28} />
      </button>

      {/* Giao diện Quả cầu AI trung tâm (Chuẩn Apple Siri) */}
      <div className="flex flex-col items-center justify-center gap-12 w-full max-w-md px-6">
        
        {/* Lời thoại của AI hoặc của người dùng */}
        <div className="h-24 flex items-end justify-center text-center">
          <h2 className={`text-2xl sm:text-3xl font-medium tracking-wide transition-all duration-500 ${
            aiState === "greeting" || aiState === "acting" ? "text-blue-300 font-semibold" : "text-white italic font-light"
          }`}>
            {aiMessage}
          </h2>
        </div>

        {/* Quả cầu sóng âm ma thuật */}
        <div className="relative flex items-center justify-center w-48 h-48 mt-8">
          {/* Các lớp sóng tỏa ra khi đang nghe */}
          {aiState === "listening" && (
            <>
              <div className="absolute w-full h-full bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute w-3/4 h-3/4 bg-blue-400/30 rounded-full animate-pulse" />
            </>
          )}

          {/* Vòng quay khi đang xử lý (Processing) */}
          {aiState === "processing" && (
             <div className="absolute w-36 h-36 border-4 border-t-blue-400 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin" />
          )}

          {/* Lõi quả cầu */}
          <div className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(37,99,235,0.6)] transition-all duration-500 ${
            aiState === "acting" ? "bg-emerald-500 shadow-emerald-500/50 scale-110" :
            aiState === "processing" ? "bg-indigo-600 scale-95" :
            "bg-gradient-to-br from-blue-400 to-indigo-600"
          }`}>
            {aiState === "processing" ? (
              <Loader2 size={40} className="text-white animate-spin" />
            ) : (
              <Mic size={44} className="text-white" />
            )}
          </div>
        </div>
        
        <p className="text-white/30 text-sm font-light mt-12 animate-pulse">
          {aiState === "listening" ? "Đang lắng nghe lệnh của bạn..." : ""}
        </p>
      </div>
    </div>
  );
}
