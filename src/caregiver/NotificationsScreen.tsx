import { useState, useEffect } from "react";
import { 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  AlertTriangle, 
  CheckSquare, 
  Loader2,
  Clock
} from "lucide-react";
import { cn } from "../lib/utils";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
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
}

export default function NotificationsScreen({ onOpenCall: _onOpenCall }: Props) {
  const { linkedPatientId, patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Người thân");

  const [filter, setFilter] = useState<"all" | "overdue" | "taken">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingMedNote, setCallingMedNote] = useState<string | null>(null);

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

        if (r.status === 'taken') {
          const takenDate = r.taken_at ? new Date(r.taken_at) : scheduledDate;
          const takenTimeStr = takenDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

          list.push({
            id: r.id,
            type: "taken",
            title: "Đã uống thuốc đúng giờ",
            message: `${patientName} đã uống xong ${medName} (${dosage || "1 liều"}) theo đúng lịch trình cữ ${scheduledTimeStr}.`,
            timestamp: `Xác nhận lúc ${takenTimeStr} hôm nay`,
            medName,
            dosage,
            scheduledTime: scheduledTimeStr,
            isUnread: false
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
                        isOverdue ? "bg-red-100 text-danger" : "bg-green-100 text-success"
                      )}>
                        {isOverdue ? "Quá giờ chưa uống" : "Đã uống đúng giờ"}
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
    </div>
  );
}
