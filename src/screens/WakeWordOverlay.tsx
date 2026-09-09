/**
 * WakeWordOverlay – Hiển thị khi phát hiện từ khóa "Hey HeyMedi"
 * Người già nói "heymedi" → màn hình này hiện ra với các tuỳ chọn:
 *   1. Gọi cấp cứu SOS
 *   2. Báo triệu chứng / khó chịu
 *   3. Nhắc thuốc (đọc to lịch uống thuốc)
 *   4. Gọi người thân
 * Tự động đóng sau 15 giây nếu không có tương tác
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Phone, Pill, Heart, X, Mic } from "lucide-react";
import { speakVietnamese, stopSpeech } from "../utils/voiceAssistant";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSOS: () => void;
  onReadMeds: () => void;
  onCallFamily: () => void;
  userName?: string;
}

const AUTO_CLOSE_SECONDS = 15;

export default function WakeWordOverlay({
  isOpen,
  onClose,
  onSOS,
  onReadMeds,
  onCallFamily,
  userName = "Bác",
}: Props) {
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);
  const [selected, setSelected] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đọc lời chào khi mở
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(AUTO_CLOSE_SECONDS);
    setSelected(null);

    // Đọc lời chào
    stopSpeech();
    const greetName = userName.toLowerCase().startsWith("bác") ? userName : `${userName}`;
    speakVietnamese(`Dạ, ${greetName} cần giúp gì ạ? Bác có thể chọn một trong các tùy chọn bên dưới.`);

    // Đếm ngược tự động đóng
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          handleClose();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
      stopSpeech();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClose = () => {
    stopCountdown();
    stopSpeech();
    onClose();
  };

  const handleSOS = () => {
    setSelected("sos");
    stopCountdown();
    stopSpeech();
    speakVietnamese("Đang kết nối cấp cứu khẩn cấp. Vui lòng giữ máy!");
    setTimeout(() => {
      onClose();
      onSOS();
    }, 800);
  };

  const handleReadMeds = () => {
    setSelected("meds");
    stopCountdown();
    stopSpeech();
    onClose();
    // Đọc lịch thuốc sau khi đóng overlay
    setTimeout(() => {
      onReadMeds();
    }, 300);
  };

  const handleCallFamily = () => {
    setSelected("family");
    stopCountdown();
    stopSpeech();
    speakVietnamese("Đang chuyển đến danh sách người thân.");
    setTimeout(() => {
      onClose();
      onCallFamily();
    }, 700);
  };

  const handleSymptom = () => {
    setSelected("symptom");
    stopCountdown();
    stopSpeech();
    speakVietnamese("Bác đang có triệu chứng gì ạ? Hãy nói để HeyMedi ghi lại giúp bác nhé.");
    // Tự đóng sau khi đọc xong
    setTimeout(() => {
      onClose();
    }, 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#0A1628]/95 to-[#1a2b4b]/95 backdrop-blur-md animate-fade-in">
      {/* Ripple animation – hiệu ứng sóng mic */}
      <div className="relative flex items-center justify-center mb-6">
        <span className="absolute w-32 h-32 rounded-full bg-primary/10 animate-ping" />
        <span className="absolute w-24 h-24 rounded-full bg-primary/15 animate-ping [animation-delay:0.3s]" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-white/20">
          <Mic size={34} className="text-white" strokeWidth={2} />
        </div>
      </div>

      {/* Tiêu đề */}
      <div className="text-center mb-1 px-4">
        <h2 className="text-white text-3xl font-black tracking-wide">Hey HeyMedi</h2>
        <p className="text-blue-200 text-base mt-1 font-medium">{userName} cần giúp gì ạ?</p>
      </div>

      {/* Đếm ngược tự đóng */}
      <div className="flex items-center gap-1.5 text-blue-300 text-xs font-semibold mb-7 mt-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span>Tự đóng sau {countdown}s</span>
      </div>

      {/* Các tùy chọn hành động */}
      <div className="w-full max-w-sm px-5 grid grid-cols-2 gap-3">
        {/* 1. SOS Khẩn cấp */}
        <ActionCard
          icon={<AlertCircle size={28} strokeWidth={2.5} />}
          label="Cấp cứu"
          sub="Gọi khẩn cấp SOS"
          color="from-red-600 to-rose-600"
          shadowColor="shadow-red-600/40"
          isSelected={selected === "sos"}
          onClick={handleSOS}
          colSpan
        />

        {/* 2. Đọc lịch thuốc */}
        <ActionCard
          icon={<Pill size={26} strokeWidth={2.5} />}
          label="Lịch thuốc"
          sub="Nghe nhắc thuốc hôm nay"
          color="from-emerald-500 to-teal-600"
          shadowColor="shadow-emerald-500/35"
          isSelected={selected === "meds"}
          onClick={handleReadMeds}
        />

        {/* 3. Gọi người thân */}
        <ActionCard
          icon={<Phone size={26} strokeWidth={2.5} />}
          label="Gọi người thân"
          sub="Video call hoặc gọi"
          color="from-blue-500 to-indigo-600"
          shadowColor="shadow-blue-500/35"
          isSelected={selected === "family"}
          onClick={handleCallFamily}
        />

        {/* 4. Báo triệu chứng */}
        <ActionCard
          icon={<Heart size={26} strokeWidth={2.5} />}
          label="Triệu chứng"
          sub="Ghi nhận khó chịu"
          color="from-amber-500 to-orange-500"
          shadowColor="shadow-amber-500/35"
          isSelected={selected === "symptom"}
          onClick={handleSymptom}
        />
      </div>

      {/* Nút đóng */}
      <button
        onClick={handleClose}
        className="mt-8 flex items-center gap-2 text-blue-300 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full border border-white/20 hover:border-white/40 transition-all active:scale-95"
      >
        <X size={16} />
        Đóng
      </button>

      {/* Gợi ý lần sau */}
      <p className="text-blue-400/60 text-[10px] mt-4 text-center px-8">
        Nói "Hey HeyMedi" bất cứ lúc nào để kích hoạt trợ lý
      </p>
    </div>
  );
}

// ─── Component phụ: ActionCard ───────────────────────────────────────────────
function ActionCard({
  icon,
  label,
  sub,
  color,
  shadowColor,
  onClick,
  isSelected,
  colSpan = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  shadowColor: string;
  onClick: () => void;
  isSelected: boolean;
  colSpan?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-3xl text-white font-bold shadow-xl active:scale-95 transition-all",
        `bg-gradient-to-br ${color} ${shadowColor}`,
        colSpan && "col-span-2",
        isSelected && "ring-4 ring-white/60 scale-95"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center",
        colSpan && "w-16 h-16"
      )}>
        {icon}
      </div>
      <div className="text-center">
        <p className={cn("font-extrabold leading-tight", colSpan ? "text-xl" : "text-base")}>{label}</p>
        <p className="text-[11px] text-white/75 font-medium mt-0.5">{sub}</p>
      </div>
    </button>
  );
}
