import { useEffect } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen" style={{ background: "linear-gradient(160deg, #1A56DB 0%, #1043B2 100%)" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-28 h-28 rounded-[32px] flex items-center justify-center border border-white/20" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="26" width="24" height="12" rx="6" fill="#60A5FA"/>
            <rect x="32" y="26" width="24" height="12" rx="6" fill="white"/>
            <path d="M16 20 L22 20 L26 14 L30 26 L34 18 L38 20 L48 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">HeyMedi</h1>
        <p className="text-blue-200 text-base font-semibold mt-1 tracking-wide">Nhắc thuốc thông minh</p>
        <p className="text-blue-100/70 text-sm font-medium text-center max-w-[200px] mt-1 leading-relaxed">Chăm sóc sức khỏe gia đình mỗi ngày</p>
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
