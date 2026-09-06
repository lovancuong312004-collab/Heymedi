import { useState, useEffect } from "react";
import { ArrowRight, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [showSplash, setShowSplash] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Sau 2 giây, ẩn màn hình Splash logo, hiện màn hình Onboarding
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const slides = [
    {
      icon: <HeartPulse size={64} className="text-primary mb-6" strokeWidth={1.5} />,
      title: "Nhắc thuốc đúng giờ",
      desc: "Lên lịch uống thuốc dễ dàng, báo thức nhắc nhở để bạn không bao giờ quên một liều nào."
    },
    {
      icon: <ShieldCheck size={64} className="text-emerald-500 mb-6" strokeWidth={1.5} />,
      title: "Kết nối Gia đình",
      desc: "Người chăm sóc có thể theo dõi, nhắc nhở và gọi điện trực tiếp từ xa một cách nhanh chóng."
    },
    {
      icon: <Sparkles size={64} className="text-purple-500 mb-6" strokeWidth={1.5} />,
      title: "Trợ lý AI Thông minh",
      desc: "Quét nhận diện thuốc bằng Camera và nhận các báo cáo phân tích sức khỏe tự động từ AI."
    }
  ];

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      onDone(); // Kết thúc onboarding, chuyển qua Login
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  if (showSplash) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen animate-fade-in" style={{ background: "linear-gradient(160deg, #1A56DB 0%, #1043B2 100%)" }}>
        <div className="flex flex-col items-center gap-4 animate-slide-up">
          <div className="w-28 h-28 rounded-[32px] flex items-center justify-center border border-white/20" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="26" width="24" height="12" rx="6" fill="#60A5FA"/>
              <rect x="32" y="26" width="24" height="12" rx="6" fill="white"/>
              <path d="M16 20 L22 20 L26 14 L30 26 L34 18 L38 20 L48 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mt-2">HeyMedi</h1>
          <p className="text-blue-200 text-sm font-semibold tracking-wide">Đồng hành cùng sức khỏe Việt</p>
        </div>
        <div className="absolute bottom-20 flex gap-2">
          {[0, 150, 300].map(delay => (
            <span key={delay} className="w-2 h-2 rounded-full bg-white/60" style={{ animation: `bounce 1s ease-in-out ${delay}ms infinite`, display: "inline-block" }} />
          ))}
        </div>
        <p className="absolute bottom-8 text-blue-200/50 text-xs font-medium">Phiên bản 1.0.0</p>
        <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white animate-fade-in relative overflow-hidden">
      {/* Nút Skip */}
      <button 
        onClick={onDone}
        className="absolute top-12 right-6 z-10 text-gray-400 font-semibold text-sm active:scale-95 transition-all"
      >
        Bỏ qua
      </button>

      {/* Decorative background circle */}
      <div className="absolute -top-[20%] -right-[20%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-[40%] -left-[20%] w-[250px] h-[250px] rounded-full bg-emerald-500/5 blur-3xl" />

      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="h-[300px] flex flex-col items-center justify-center animate-slide-up">
          {slides[currentSlide].icon}
          <h2 className="text-3xl font-black text-[#1A2B4B] mb-4 leading-tight">
            {slides[currentSlide].title}
          </h2>
          <p className="text-gray-500 text-base font-medium leading-relaxed max-w-[280px]">
            {slides[currentSlide].desc}
          </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="pb-12 px-8 flex flex-col items-center relative z-10">
        {/* Pagination Dots */}
        <div className="flex items-center gap-2 mb-10">
          {slides.map((_, idx) => (
            <div 
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-primary' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Next/Start Button */}
        <button
          onClick={handleNext}
          className="w-full bg-primary text-white py-[18px] rounded-2xl font-bold text-[17px] shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          {currentSlide === slides.length - 1 ? 'Bắt đầu sử dụng' : 'Tiếp tục'}
          {currentSlide !== slides.length - 1 && <ArrowRight size={20} />}
        </button>
      </div>
    </div>
  );
}
