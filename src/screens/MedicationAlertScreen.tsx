import { Bell, Volume2, Check, X } from "lucide-react";

interface Medicine {
  name: string;
  dosage: string;
  instruction: string;
  time: string;
}

interface Props {
  medicine: Medicine;
  onTaken: () => void;
  onSnooze?: () => void; 
}

export default function MedicationAlertScreen({ medicine, onTaken, onSnooze }: Props) {
  return (
    <div className="absolute inset-0 z-50 bg-[#FFF9F8] flex flex-col items-center justify-center py-10 px-6 text-center font-sans overflow-hidden">
      
      {/* Nút thoát (Đóng) */}
      {onSnooze && (
        <button 
          onClick={onSnooze}
          className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 text-gray-500 active:scale-95 transition-all z-10"
        >
          <X size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* 1. Header with Bell and Time */}
      <div className="flex flex-col items-center gap-0 w-full mb-6 mt-4">
        <div className="w-16 h-16 rounded-full bg-[#FF5C39] flex items-center justify-center shadow-lg mb-4">
          <Bell className="text-white fill-white" size={32} style={{ animation: "ring 1s ease-in-out infinite" }} />
        </div>
        
        <h1 className="text-[34px] font-black text-[#E11D1D] leading-[1.1] text-center mb-5 tracking-tight uppercase">
          Đến giờ<br />uống thuốc!
        </h1>
        
        <p className="text-[#0B1B47] font-bold text-[17px]">Giờ uống</p>
        <p className="text-[64px] font-black text-[#0B1B47] leading-none mt-1 tracking-tighter">
          {medicine.time}
        </p>
      </div>

      {/* 2. Pill Info */}
      <div className="flex flex-col items-center w-full mb-8">
        <div className="w-40 h-40 rounded-full bg-[#FCE8E6] flex items-center justify-center shadow-inner relative mb-4">
           {/* CSS-drawn white pill with '5' on it */}
           <div className="w-[90px] h-[90px] bg-white rounded-full shadow-[0_8px_15px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gray-200" />
              <span className="text-gray-300 font-bold text-3xl font-serif z-10 mr-4">5</span>
           </div>
        </div>
        
        <p className="text-primary font-bold text-sm uppercase tracking-widest mb-1">Tên thuốc</p>
        <h2 className="text-[38px] font-black text-[#0B1B47] mb-2 leading-none text-center px-4">{medicine.name}</h2>
        <p className="text-[#3b476b] text-[17px] font-semibold bg-[#EBF1FF] px-4 py-1.5 rounded-full">{medicine.dosage} • {medicine.instruction}</p>
      </div>

      {/* 3. Action Buttons */}
      <div className="w-full flex flex-col gap-4 mt-auto">
        <button
          onClick={onTaken}
          className="w-full bg-[#18A048] text-white py-[18px] rounded-xl font-bold text-[17px] shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all uppercase tracking-wide border-b-4 border-[#117C35]"
        >
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
             <Check className="text-[#18A048]" size={18} strokeWidth={4} />
          </div>
          Tôi đã uống thuốc
        </button>

        <button
          className="w-full bg-white border border-[#D1DEFF] py-3.5 px-5 rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(28,78,216,0.05)]"
        >
          <Volume2 size={30} className="text-[#1C4ED8] fill-[#1C4ED8]" />
          <div className="flex flex-col items-start">
            <span className="text-[#1C4ED8] font-bold text-[15px] tracking-wide uppercase">Nghe lại hướng dẫn</span>
            <span className="text-gray-500 text-[11px] font-medium mt-0.5">Ấn để nghe lại cách uống thuốc</span>
          </div>
        </button>
      </div>

      <style>{`@keyframes ring { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }`}</style>
    </div>
  );
}
