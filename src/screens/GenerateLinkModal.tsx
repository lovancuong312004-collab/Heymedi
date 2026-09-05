import { useState, useEffect } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";
import QRCode from "react-qr-code";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function GenerateLinkModal({ isOpen, onClose, user }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (isOpen) {
      generateCode();
    } else {
      setCode(null);
      setTimeLeft(300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!code) return;
    
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          generateCode(); // regenerate when expired
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    // Realtime subscription to see if a caregiver linked this patient
    const channel = supabase
      .channel('family_links_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_links', filter: `patient_id=eq.${user.id}` },
        () => {
          // A caregiver just linked to us!
          alert("Tuyệt vời! Đã có người chăm sóc kết nối thành công với bạn.");
          onClose();
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [code]);

  const generateCode = async () => {
    setLoading(true);
    // Delete existing codes for this user
    await supabase.from('link_codes').delete().eq('patient_id', user.id);
    
    // Generate new 6-char alphanumeric code
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const { error } = await supabase.from('link_codes').insert([
      {
        code: newCode,
        patient_id: user.id,
        patient_name: user?.user_metadata?.full_name || 'Bệnh nhân',
        expires_at: expiresAt.toISOString()
      }
    ]);

    if (!error) {
      setCode(newCode);
    } else {
      console.error(error);
      alert("Lỗi tạo mã: " + error.message);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in bg-black/40 backdrop-blur-sm">
      <div className="w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#1A2B4B]">Mã kết nối của tôi</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          {loading || !code ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 size={40} className="text-primary animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Đang tạo mã an toàn...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full animate-fade-in">
              <p className="text-center text-gray-500 mb-6 font-medium text-sm">
                Đưa mã QR này cho người chăm sóc quét, hoặc đọc mã số bên dưới.
              </p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-gray-100 mb-6">
                <QRCode value={`heymedi://link?code=${code}`} size={180} />
              </div>

              {/* Text Code */}
              <div className="w-full bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-200 mb-4">
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black tracking-[0.3em] text-primary">{code}</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 active:scale-95"
                >
                  {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                </button>
              </div>

              {/* Countdown */}
              <p className="text-sm font-bold text-danger bg-red-50 px-4 py-2 rounded-full">
                Mã sẽ hết hạn sau {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
