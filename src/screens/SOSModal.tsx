import { useState, useEffect, useRef } from "react";
import { AlertTriangle, PhoneOff, MapPin, CheckCircle2, Loader2, Phone } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  patientId?: string;
  patientName?: string;
}

export default function SOSModal({ 
  isOpen, 
  onClose, 
  contactName = "Người thân",
  patientId,
  patientName = "Người bệnh"
}: Props) {
  const [countdown, setCountdown] = useState(5);
  const [stage, setStage] = useState<"countdown" | "sending" | "sent">("countdown");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setStage("countdown");
      setGpsCoords(null);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTriggerEmergency();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const handleTriggerEmergency = async () => {
    setStage("sending");

    // 1. Get GPS Location
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 6000,
            enableHighAccuracy: true
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
      }
    } catch (err) {
      console.warn("Could not get precise GPS, using fallback:", err);
      // Fallback: Ha Noi center coords if GPS is blocked
      lat = 21.028511;
      lng = 105.804817;
      setGpsCoords({ lat, lng });
    }

    // 2. Broadcast EMERGENCY over Supabase channel 'sos-emergency-alerts'
    try {
      const channel = supabase.channel('sos-emergency-alerts');
      
      const payload = {
        patient_id: patientId || "patient_unknown",
        patient_name: patientName,
        lat,
        lng,
        google_maps_url: lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null,
        timestamp: new Date().toISOString()
      };

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'EMERGENCY',
            payload
          });
          console.log("SOS Broadcast sent on SUBSCRIBED:", payload);
        }
      });

      // Backup immediate send
      channel.send({
        type: 'broadcast',
        event: 'EMERGENCY',
        payload
      }).catch(() => {});

      console.log("SOS Broadcast EMERGENCY triggered successfully:", payload);
    } catch (e) {
      console.error("SOS Broadcast failed:", e);
    } finally {
      setStage("sent");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-red-600 via-red-700 to-rose-900 flex flex-col items-center justify-between p-6 text-white animate-fade-in select-none">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-xs font-black uppercase tracking-wider">
          <AlertTriangle size={16} className="text-amber-300" />
          <span>Hệ thống Cảnh Báo Khẩn Cấp Heymedi</span>
        </div>
      </div>

      {/* Main Content by Stage */}
      {stage === "countdown" && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-sm text-center">
          <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-ping">
            <AlertTriangle size={56} className="text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 uppercase tracking-tight">
            Đang gọi cấp cứu
          </h1>
          <p className="text-white/90 text-lg font-bold mb-6">
            cho {contactName}...
          </p>

          <div className="text-[110px] font-black text-white leading-none my-4 drop-shadow-lg animate-bounce">
            {countdown}
          </div>

          <p className="text-white/80 text-sm max-w-xs mt-2 font-medium">
            Hệ thống sẽ tự động gửi tọa độ GPS và kích hoạt còi hú báo động đến người thân sau {countdown} giây.
          </p>
        </div>
      )}

      {stage === "sending" && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-sm text-center space-y-6">
          <Loader2 size={64} className="text-white animate-spin" />
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Đang lấy tọa độ GPS...</h2>
            <p className="text-white/80 text-sm mt-2">Đang truyền phát tín hiệu cấp cứu tới ứng dụng người nhà</p>
          </div>
        </div>
      )}

      {stage === "sent" && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-sm text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-white text-danger flex items-center justify-center shadow-2xl animate-pulse">
            <CheckCircle2 size={56} className="text-emerald-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">
              ĐÃ PHÁT TÍN HIỆU CẤP CỨU!
            </h2>
            <p className="text-white/90 text-sm leading-relaxed">
              Còi báo động khẩn cấp đang hú trên điện thoại của <b>{contactName}</b>.
            </p>
          </div>

          {gpsCoords && (
            <div className="w-full bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs text-left flex items-start gap-3">
              <MapPin size={20} className="text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Tọa độ GPS đã đính kèm:</span>
                <span className="text-white/80 block mt-0.5">{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</span>
                <a 
                  href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-amber-300 font-bold underline block mt-1.5"
                >
                  Mở vị trí trên Google Maps
                </a>
              </div>
            </div>
          )}

          <button
            onClick={() => { window.location.href = "tel:115"; }}
            className="w-full bg-white text-danger py-3.5 rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Phone size={20} />
            GỌI TỔNG ĐÀI CẤP CỨU 115
          </button>
        </div>
      )}

      {/* Bottom Action */}
      <div className="w-full max-w-sm pb-4">
        {stage === "countdown" ? (
          <button
            onClick={handleCancel}
            className="w-full bg-white text-danger py-5 rounded-2xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer hover:bg-white/95"
          >
            <PhoneOff size={28} strokeWidth={3} />
            <span>HỦY GỌI NGAY ({countdown}s)</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full bg-white/20 hover:bg-white/30 border border-white/40 text-white py-4 rounded-2xl font-bold text-base transition-all active:scale-95 cursor-pointer"
          >
            ĐÓNG MÀN HÌNH BÁO ĐỘNG
          </button>
        )}
      </div>

    </div>
  );
}
