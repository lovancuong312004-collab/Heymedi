import { useState, useEffect } from "react";
import { AlertTriangle, PhoneOff } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
}

export default function SOSModal({ isOpen, onClose, contactName }: Props) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // In a real app, this would trigger the actual phone call
            window.location.href = `tel:0901234567`; 
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-danger flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-8 animate-pulse">
        <AlertTriangle size={64} className="text-white" strokeWidth={2.5} />
      </div>

      <h1 className="text-4xl font-black text-white text-center mb-4 leading-tight uppercase">
        Đang gọi cấp cứu
      </h1>
      
      <p className="text-white/90 text-2xl font-bold text-center mb-8">
        cho {contactName}...
      </p>

      <div className="text-[120px] font-black text-white leading-none mb-12">
        {countdown}
      </div>

      <button
        onClick={onClose}
        className="w-full bg-white text-danger py-6 rounded-3xl font-black text-2xl shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all"
      >
        <PhoneOff size={32} strokeWidth={3} />
        HỦY GỌI NGAY
      </button>
    </div>
  );
}
