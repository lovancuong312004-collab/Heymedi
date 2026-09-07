import { useState, useEffect } from "react";
import { 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  AlertTriangle, 
  CheckSquare, 
  Loader2,
  Clock,
  PhoneOff,
  Camera,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
import { getMissedCalls, markMissedCallsAsRead, type MissedCall } from "../services/missedCallService";
import { getMedicationTimingOffset, getPillProof } from "../services/medicationService";
import CallModal from "./CallModal";

interface Props {
  onOpenCall?: () => void;
}

interface NotificationItem {
  id: string;
  type: "overdue" | "taken";
  title: string;
  message: string;
  timestamp: string;
  medName: string;
  dosage: string;
  scheduledTime: string;
  isUnread: boolean;
  photoUrl?: string | null;
  timingBadge?: string;
  timingColor?: 'emerald' | 'rose' | 'amber';
}

export default function NotificationsScreen({ onOpenCall: _onOpenCall }: Props) {
  const { linkedPatientId, patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Người thân");

  const [filter, setFilter] = useState<"all" | "overdue" | "taken">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingMedNote, setCallingMedNote] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; medName: string } | null>(null);

  useEffect(() => {
    markMissedCallsAsRead();
    setMissedCalls(getMissedCalls());

    const handleMissed = () => {
      setMissedCalls(getMissedCalls());
    };
    window.addEventListener('heymedi_missed_calls_changed', handleMissed);
    return () => {
      window.removeEventListener('heymedi_missed_calls_changed', handleMissed);
    };
  }, []);

  const fetchTodayReminders = async () => {
    if (!linkedPatientId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('reminders')
        .select(`
          id,
          scheduled_time,
          status,
          taken_at,
          medication:medications (id, name, dosage, instructions)
        `)
        .eq('patient_id', linkedPatientId)
        .gte('scheduled_time', startOfDay.toISOString())
        .lte('scheduled_time', endOfDay.toISOString())
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      const now = new Date();
      const list: NotificationItem[] = [];

      (data || []).forEach((r: any) => {
        const med = Array.isArray(r.medication) ? r.medication[0] : r.medication;
        const medName = med?.name || "Thuốc";
        const dosage = med?.dosage || "";
        const scheduledDate = new Date(r.scheduled_time);
        const scheduledTimeStr = scheduledDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const proofUrl = (r as any).proof_image_url || getPillProof(r.id);

        if (r.status === 'taken') {
          const takenDate = r.taken_at ? new Date(r.taken_at) : scheduledDate;
          const takenTimeStr = takenDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const timingOffset = getMedicationTimingOffset(r.scheduled_time, r.taken_at);

          let dynamicTitle = "Đã uống thuốc";
          let timingBadge = "Đúng giờ";
          let timingColor: 'emerald' | 'rose' | 'amber' = 'emerald';

          if (timingOffset) {
            timingBadge = timingOffset.label;
            timingColor = timingOffset.badgeColor;
            if (timingOffset.status === 'late') {
              dynamicTitle = `⚠️ ĐÃ UỐNG TRỄ ${timingOffset.label.replace('Trễ ', '').toUpperCase()}`;
            } else if (timingOffset.status === 'early') {
              dynamicTitle = `Uống sớm ${timingOffset.label.replace('Sớm ', '')}`;
            } else {
              dynamicTitle = "Đã uống thuốc đúng giờ";
            }
          }

          list.push({
            id: r.id,
            type: "taken",
            title: dynamicTitle,
            message: `${patientName} đã uống xong ${medName} (${dosage || "1 liều"}). Lịch cữ ${scheduledTimeStr} • Uống lúc ${takenTimeStr}${timingOffset ? ` (${timingOffset.label})` : ''}.${proofUrl ? ' Đã có ảnh chụp vỉ thuốc minh chứng!' : ''}`,
            timestamp: `Xác nhận lúc ${takenTimeStr} hôm nay`,
            medName,
            dosage,
            scheduledTime: scheduledTimeStr,
            isUnread: false,
            photoUrl: proofUrl,
            timingBadge,
            timingColor
          });
        } else if (r.status === 'missed' || (r.status === 'pending' && now.getTime() - scheduledDate.getTime() > 15 * 60000)) {
          const diffMinutes = Math.max(15, Math.floor((now.getTime() - scheduledDate.getTime()) / 60000));
          list.push({
            id: r.id,
            type: "overdue",
            title: "CẢNH BÁO: Quá giờ chưa uống thuốc!",
            message: `${patientName} chưa xác nhận uống ${medName} (${dosage || "1 liều"}) cữ ${scheduledTimeStr}. Đã quá giờ hơn ${diffMinutes} phút!`,
            timestamp: `Lịch cữ ${scheduledTimeStr} (Trễ ${diffMinutes} phút)`,
            medName,
            dosage,
            scheduledTime: scheduledTimeStr,
            isUnread: true
          });
        }
      });

      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayReminders();

    if (linkedPatientId) {
      const channelName = `notifs-realtime-${linkedPatientId}-${Date.now()}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
          fetchTodayReminders();
        })
        .subscribe();

      const timer = setInterval(fetchTodayReminders, 20000);

      return () => {
        clearInterval(timer);
        supabase.removeChannel(channel);
      };
    }
  }, [linkedPatientId]);

  const filteredList = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const overdueCount = notifications.filter(n => n.type === "overdue").length;
  const takenCount = notifications.filter(n => n.type === "taken").length;

  return (
    <div className="p-5 flex flex-col gap-4 min-h-full bg-[#F4F7FB] animate-fade-in pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-1 relative mt-2">
        <div>
          <h1 className="text-2xl font-black text-[#1a2b4b]">Thông báo hôm nay</h1>
          <p className="text-gray-400 text-xs mt-0.5">Dữ liệu cập nhật theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
          <Clock size={14} />
          <span>Hôm nay</span>
        </div>
      </div>

      {/* Danh sách Cuộc Gọi Nhỡ Gần Đây */}
      {missedCalls.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 via-rose-500/10 to-amber-500/10 border-2 border-red-300 rounded-3xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-danger font-black text-xs uppercase tracking-wider">
              <PhoneOff size={16} />
              <span>Cuộc gọi nhỡ gần đây ({missedCalls.length})</span>
            </div>
            <span className="text-[10px] text-red-700 font-bold bg-white px-2.5 py-0.5 rounded-full border border-red-200 shadow-2xs">
              Cần gọi lại
            </span>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            {missedCalls.map((call) => (
              <div key={call.id} className="bg-white rounded-2xl p-3 border border-red-100 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-danger flex items-center justify-center shrink-0">
                    <PhoneOff size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#1a2b4b] truncate">{call.callerName}</h4>
                    <p className="text-xs text-red-600 font-semibold">
                      Cuộc gọi nhỡ lúc {call.formattedTime} ({call.formattedDate})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => _onOpenCall ? _onOpenCall() : setCallingMedNote("Gọi lại cuộc gọi nhỡ")}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <Phone size={13} className="fill-white" />
                  <span>Gọi lại</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Status Badges */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => setFilter("overdue")}
          className={cn(
            "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
            filter === "overdue" ? "border-danger bg-red-50/80 shadow-sm" : "border-gray-100 bg-white"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-danger flex items-center justify-center font-bold">
              <AlertCircle size={18} />
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block">Quá giờ</span>
              <span className="text-base font-black text-danger">{overdueCount} cữ</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilter("taken")}
          className={cn(
            "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
            filter === "taken" ? "border-success bg-green-50/80 shadow-sm" : "border-gray-100 bg-white"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-100 text-success flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block">Đã uống</span>
              <span className="text-base font-black text-success">{takenCount} cữ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: "all", label: `Tất cả (${notifications.length})`, icon: null },
          { key: "overdue", label: `Quá giờ (${overdueCount})`, icon: (active: boolean) => <AlertTriangle size={15} className={active ? "text-white" : "text-danger"} /> },
          { key: "taken", label: `Đã uống (${takenCount})`, icon: (active: boolean) => <CheckSquare size={15} className={active ? "text-white" : "text-success"} /> }
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer",
                isActive
                  ? "bg-primary text-white border-primary shadow-sm shadow-primary/25"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tab.icon && tab.icon(isActive)}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3 mt-1">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
            <Loader2 size={32} className="text-primary animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-500">Đang cập nhật danh sách nhắc thuốc...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
            <Bell size={36} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1a2b4b]">
              {filter === "overdue" 
                ? "Không có cữ thuốc nào bị quá giờ!" 
                : filter === "taken" 
                ? "Chưa có cữ thuốc nào được xác nhận uống hôm nay." 
                : "Chưa có thông báo thuốc nào hôm nay."}
            </p>
            <p className="text-xs text-gray-400 mt-1">Hệ thống luôn tự động giám sát 24/7</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isOverdue = item.type === "overdue";

            return (
              <div
                key={item.id}
                className={cn(
                  "p-4 rounded-3xl border shadow-sm transition-all flex flex-col gap-3 relative overflow-hidden",
                  isOverdue 
                    ? "bg-gradient-to-r from-red-50/70 via-white to-white border-red-200" 
                    : "bg-gradient-to-r from-emerald-50/70 via-white to-white border-emerald-200"
                )}
              >
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                      isOverdue
                        ? "bg-red-500 text-white"
                        : "bg-emerald-500 text-white"
                    )}
                  >
                    {isOverdue ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        isOverdue 
                          ? "bg-red-100 text-danger" 
                          : item.timingColor === "rose"
                          ? "bg-rose-100 text-rose-800 animate-pulse font-black"
                          : item.timingColor === "amber"
                          ? "bg-amber-100 text-amber-800 font-bold"
                          : "bg-green-100 text-success"
                      )}>
                        {isOverdue ? "Quá giờ chưa uống" : (item.timingBadge || "Đã uống")}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">{item.scheduledTime}</span>
                    </div>

                    <h4 className={cn(
                      "text-sm font-bold mt-1 leading-snug",
                      isOverdue ? "text-danger" : "text-[#1a2b4b]"
                    )}>
                      {item.title}
                    </h4>
                  </div>
                </div>

                {/* Message Body */}
                <p className="text-xs text-gray-700 font-medium leading-relaxed bg-white/70 p-3 rounded-2xl border border-gray-100">
                  {item.message}
                </p>

                {/* Ảnh chụp minh chứng vỉ thuốc nếu có */}
                {item.photoUrl && (
                  <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-2xl p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-900 border border-emerald-300 shrink-0">
                        <img src={item.photoUrl} alt="Ảnh vỉ thuốc" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block">Minh chứng vỉ thuốc</span>
                        <span className="text-[10px] text-emerald-700 font-medium">Ảnh chụp lúc uống thuốc</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingPhoto({ url: item.photoUrl!, medName: item.medName })}
                      className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      Xem ảnh to
                    </button>
                  </div>
                )}

                {/* Footer / Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {item.timestamp}
                  </span>

                  {isOverdue && (
                    <button
                      onClick={() => setCallingMedNote(`Nhắc uống thuốc ${item.medName} (${item.dosage}) cữ ${item.scheduledTime}`)}
                      className="bg-danger hover:bg-danger/90 active:scale-95 text-white py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Phone size={13} className="fill-white" />
                      <span>Gọi nhắc ngay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Calling Modal mockup */}
      {callingMedNote && (
        <CallModal 
          isOpen={!!callingMedNote}
          onClose={() => setCallingMedNote(null)}
          patientName={patientName}
          patientPhone="0901 234 567"
          avatarUrl={patientInfo?.avatar_url}
          reminderNote={callingMedNote}
        />
      )}

      {/* Modal phóng to ảnh minh chứng vỉ thuốc */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                <h4 className="font-black text-sm text-[#1a2b4b]">
                  Ảnh vỉ thuốc: {viewingPhoto.medName}
                </h4>
              </div>
              <button
                onClick={() => setViewingPhoto(null)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center min-h-[300px] max-h-[550px] overflow-hidden">
              <img 
                src={viewingPhoto.url} 
                alt="Minh chứng vỉ thuốc" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="p-3.5 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewingPhoto(null)}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20 cursor-pointer"
              >
                Đóng ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
