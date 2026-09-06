import { useState, useEffect } from "react";

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
      image: "/dangnhap1.png",
      title: "Nhắc thuốc đúng giờ",
      desc: "Lên lịch uống thuốc dễ dàng, báo thức nhắc nhở để bạn không bao giờ quên một liều nào."
    },
    {
      image: "/dangnhap2.png",
      title: "Kết nối Gia đình",
      desc: "Người chăm sóc có thể theo dõi, nhắc nhở và gọi điện trực tiếp từ xa một cách nhanh chóng."
    },
    {
      image: "/dangnhap3.png",
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
    <div className="flex-1 flex flex-col min-h-screen bg-black animate-fade-in relative overflow-hidden">
      
      {/* Video preload ngầm để khi sang Login không bị giật */}
      <video 
        src="/Video%20Project%201.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="hidden" 
      />

      {/* Tràn ảnh Full Màn Hình */}
      <div className="absolute inset-0 z-0">
        <img 
          src={slides[currentSlide].image} 
          alt="Onboarding" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hotspots để click (Vùng bấm vô hình) */}
      
      {/* Vùng bấm "Bỏ qua" ở góc trên cùng bên phải */}
      <button 
        onClick={onDone}
        className="absolute top-8 right-4 w-28 h-16 z-20 bg-transparent"
        aria-label="Bỏ qua"
      />

      {/* Vùng bấm quay lại (1/3 màn hình bên trái) */}
      <button 
        onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
        className="absolute top-24 left-0 w-1/3 bottom-32 z-10 bg-transparent"
        aria-label="Quay lại"
      />

      {/* Vùng bấm tiếp theo (2/3 màn hình bên phải) */}
      <button 
        onClick={handleNext}
        className="absolute top-24 right-0 w-2/3 bottom-32 z-10 bg-transparent"
        aria-label="Tiếp theo"
      />

      {/* Vùng bấm nút to ở dưới cùng (Tiếp tục / Bắt đầu) */}
      <button 
        onClick={handleNext}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[85%] h-20 z-20 bg-transparent"
        aria-label="Tiếp tục"
      />
    </div>
  );
}
