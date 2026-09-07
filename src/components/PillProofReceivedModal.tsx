import { 
  X, 
  CheckCircle2, 
  Phone, 
  Clock, 
  Sparkles, 
  Pill, 
  Maximize2 
} from "lucide-react";
import { cn } from "../lib/utils";
import { getMedicationTimingOffset } from "../services/medicationService";
import { useState } from "react";

export interface PillProofPayload {
  patient_id?: string;
  patient_name?: string;
  reminder_id?: string;
  med_name: string;
  dosage?: string;
  photo_url: string;
  scheduled_time?: string;
  taken_at?: string;
  timestamp: string;
}

interface Props {
  alertData: PillProofPayload | null;
  onClose: () => void;
  onOpenCall?: () => void;
}

export default function PillProofReceivedModal({
  alertData,
  onClose,
  onOpenCall
}: Props) {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!alertData) return null;

  const timingOffset = alertData.scheduled_time && alertData.taken_at 
    ? getMedicationTimingOffset(alertData.scheduled_time, alertData.taken_at)
    : null;

  const formatHourMinute = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <CheckCircle2 size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-100 block">
                MINH CHỨNG UỐNG THUỐC
              </span>
              <h3 className="font-black text-base leading-tight">
                {alertData.patient_name || "Người thân"} đã uống thuốc!
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Thông tin thuốc & Giờ uống */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Pill size={16} />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-[#1a2b4b]">
                    {alertData.med_name}
                  </h4>
                  {alertData.dosage && (
                    <span className="text-xs font-bold text-emerald-700">
                      Liều: {alertData.dosage}
                    </span>
                  )}
                </div>
              </div>

              {/* Timing offset badge */}
              {timingOffset && (
                <span className={cn(
                  "text-[11px] font-black px-2.5 py-1 rounded-full border shrink-0",
                  timingOffset.badgeColor === "emerald" 
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : timingOffset.badgeColor === "rose"
                    ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                )}>
                  {timingOffset.label}
                </span>
              )}
            </div>

            {/* Chi tiết giờ lịch hẹn vs giờ thực tế */}
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-emerald-200/60 font-medium">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                <span>Lịch: <strong>{formatHourMinute(alertData.scheduled_time) || "Định kỳ"}</strong></span>
              </span>
              <span>Uống lúc: <strong className="text-emerald-700">{formatHourMinute(alertData.taken_at || alertData.timestamp)}</strong></span>
            </div>
          </div>

          {/* ẢNH CHỤP MINH CHỨNG VỈ THUỐC TỪ NGƯỜI GIÀ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-[#1a2b4b] tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                <span>Ảnh chụp vỉ thuốc từ người bệnh:</span>
              </label>
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Maximize2 size={12} />
                <span>{isZoomed ? "Thu nhỏ" : "Phóng to"}</span>
              </button>
            </div>

            <div 
              onClick={() => setIsZoomed(!isZoomed)}
              className={cn(
                "rounded-2xl overflow-hidden border-2 border-emerald-300 bg-gray-900 relative shadow-inner cursor-pointer group transition-all",
                isZoomed ? "max-h-[70vh] h-[400px]" : "h-64"
              )}
            >
              <img 
                src={alertData.photo_url} 
                alt="Minh chứng uống thuốc" 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold">
                Bấm vào để {isZoomed ? "thu nhỏ" : "phóng to"}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 shrink-0 flex items-center gap-2.5">
          {onOpenCall && (
            <button
              onClick={() => {
                onClose();
                onOpenCall();
              }}
              className="flex-1 py-3 px-3 rounded-2xl bg-white hover:bg-gray-100 text-[#1a2b4b] border border-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <Phone size={15} className="text-emerald-600" />
              <span>Gọi cho người thân</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 size={16} />
            <span>ĐÃ XEM & XÁC NHẬN</span>
          </button>
        </div>

      </div>
    </div>
  );
}
