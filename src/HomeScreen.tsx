import { useState, useEffect } from "react";
import { Calendar, Volume2, Scan, AlertCircle, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { Lunar } from "lunar-javascript";
import SOSModal from "./screens/SOSModal";
import MedicationAlertScreen from "./screens/MedicationAlertScreen";
import ScanUnknownMedModal from "./screens/ScanUnknownMedModal";
import { getTodaySchedule, markAsTaken, type Reminder } from "./services/medicationService";
import { announceMedication, announceDailyBriefing } from "./utils/voiceAssistant";
import { supabase } from "./lib/supabase";

interface Props {
  user: any;
  onLogout: () => void;
  isAudioUnlocked?: boolean;
}

export default function HomeScreen({ user, onLogout: _onLogout, isAudioUnlocked = true }: Props) {
  const rawName = user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "");
  const patientDisplayName = rawName ? (rawName.toLowerCase().startsWith("bác ") ? rawName : `Bác ${rawName}`) : "Bác";
  const patientId = user?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isScanUnknownOpen, setIsScanUnknownOpen] = useState(false);
  
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingId, setTakingId] = useState<string | null>(null);

  // Alarm and audio state
  const [alertMed, setAlertMed] = useState<Reminder | null>(null);
  const [snoozedMap, setSnoozedMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (patientId) {
      loadSchedule();

      const channelName = `elderly-home-${patientId}-${Date.now()}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
          loadSchedule();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
          loadSchedule();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [patientId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await getTodaySchedule(patientId);
      setSchedule(data);
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động kích hoạt chuông và màn hình nhắc thuốc khi đến giờ hoặc đã qua giờ chưa uống
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);

      // Kiểm tra xem có cữ thuốc nào đến hạn hoặc quá giờ mà chưa uống không
      if (isAudioUnlocked && schedule.length > 0 && !alertMed) {
        const dueMed = schedule.find(r => {
          if (r.status !== 'pending') return false;
          const schedTime = new Date(r.scheduled_time).getTime();
          // Thời gian hẹn nhỏ hơn hoặc bằng hiện tại
          if (schedTime > now.getTime()) return false;
          // Kiểm tra xem có đang trong thời gian hoãn báo thức (snooze) không
          const snoozeUntil = snoozedMap[r.id];
          if (snoozeUntil && snoozeUntil > now.getTime()) return false;
          return true;
        });

        if (dueMed) {
          setAlertMed(dueMed);
          announceMedication(
            dueMed.medication?.name || "Thuốc",
            dueMed.medication?.dosage || "1 liều"
          );
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule, isAudioUnlocked, alertMed, snoozedMap]);

  const handleTakeMedication = async (reminderId: string, photoUrl?: string) => {
    try {
      setTakingId(reminderId);
      await markAsTaken(reminderId);
      if (photoUrl) {
        // Broadcast xác nhận kèm ảnh đối chiếu thuốc cho người nhà
        const channel = supabase.channel('sos-emergency-alerts');
        channel.send({
          type: 'broadcast',
          event: 'PILL_TAKEN_PROOF',
          payload: {
            patient_id: patientId,
            patient_name: patientDisplayName,
            reminder_id: reminderId,
            photo_url: photoUrl,
            timestamp: new Date().toISOString()
          }
        }).catch(() => {});
      }
      await loadSchedule();
      setAlertMed(null);
    } catch (error) {
      console.error("Failed to mark as taken:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setTakingId(null);
    }
  };

  const handleSnooze = () => {
    if (alertMed) {
      // Hoãn báo lại sau 5 phút
      setSnoozedMap(prev => ({
        ...prev,
        [alertMed.id]: Date.now() + 5 * 60 * 1000
      }));
      setAlertMed(null);
    }
  };

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const timeString = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
  const lunarString = `(Ngày ${String(lunar.getDay()).padStart(2, '0')} tháng ${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  const currentHour = currentDate.getHours();
  let greetingTime = "Chào buổi sáng";
  if (currentHour >= 11 && currentHour < 14) greetingTime = "Chào buổi trưa";
  else if (currentHour >= 14 && currentHour < 18) greetingTime = "Chào buổi chiều";
  else if (currentHour >= 18 || currentHour < 5) greetingTime = "Chào buổi tối";

  const nowTime = currentDate.getTime();

  // TÁCH BẠCH RÕ RÀNG: Thuốc quá giờ chưa uống vs Thuốc tiếp theo sắp tới
  const overdueReminders = (schedule || []).filter(r => 
    r?.status === 'pending' && new Date(r.scheduled_time).getTime() <= nowTime
  );

  const upcomingReminders = (schedule || []).filter(r => 
    r?.status === 'pending' && new Date(r.scheduled_time).getTime() > nowTime
  );

  const nextReminder = upcomingReminders[0] || null;

  return (
    <>
      <SOSModal 
        isOpen={isSOSOpen} 
        onClose={() => setIsSOSOpen(false)} 
        contactName="Người thân" 
        patientId={patientId}
        patientName={patientDisplayName}
      />

      <ScanUnknownMedModal
        isOpen={isScanUnknownOpen}
        onClose={() => setIsScanUnknownOpen(false)}
        user={user}
        currentSchedule={schedule}
        onAddedMed={loadSchedule}
      />

      {alertMed && (
        <MedicationAlertScreen
          medicine={{
            name: alertMed.medication?.name || "Thuốc",
            dosage: alertMed.medication?.dosage || "1 liều",
            instruction: alertMed.medication?.instructions || "Theo chỉ dẫn",
            time: new Date(alertMed.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }}
          onTaken={(photoUrl?: string) => handleTakeMedication(alertMed.id, photoUrl)}
          onSnooze={handleSnooze}
        />
      )}
      
      <div className="p-4 flex flex-col gap-3.5 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2.5 mt-1">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 border-2 border-white shadow-sm shrink-0 flex items-center justify-center text-primary font-bold text-base">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{(patientDisplayName.replace(/^bác\s+/i, '') || "B")[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">{greetingTime},</p>
            <h1 className="text-lg font-bold text-[#1a2b4b]">{patientDisplayName} 👋</h1>
          </div>
        </div>

        {/* Date/Time Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#EBF1FF] flex items-center justify-center shrink-0">
              <Calendar size={22} className="text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[#1a2b4b] font-bold text-2xl mb-0.5">{timeString}</h2>
              <p className="text-[#1a2b4b] font-semibold text-sm">{dateString}</p>
              <p className="text-gray-500 text-xs mt-0.5">{lunarString}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              announceDailyBriefing({
                patientName: rawName ? rawName.replace(/^bác\s+/i, '') : "Bác",
                hour: currentDate.getHours(),
                minute: currentDate.getMinutes(),
                solarDate: `${dayOfWeek}, ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1}`,
                lunarDate: `ngày ${String(lunar.getDay()).padStart(2, '0')} tháng ${String(lunar.getMonth()).padStart(2, '0')} Âm lịch`,
                schedule
              });
            }}
            className="w-11 h-11 rounded-full bg-[#EBF1FF] text-primary flex items-center justify-center shrink-0 active:scale-90 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
            title="Nghe thông báo ngày & lịch thuốc hôm nay"
          >
            <Volume2 size={22} className="text-primary" strokeWidth={2.5} />
          </button>
        </div>

        {/* 1. MỤC CẢNH BÁO: CÁC THUỐC QUÁ GIỜ CHƯA UỐNG */}
        {overdueReminders.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-amber-50 border-2 border-red-200 rounded-3xl p-4 shadow-sm flex flex-col gap-2.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
                <span className="text-red-700 font-black text-xs uppercase tracking-wider">
                  ⚠️ Quá giờ chưa uống ({overdueReminders.length} cữ)
                </span>
              </div>
              <span className="text-red-600 font-bold text-xs bg-red-100/90 px-2 py-0.5 rounded-full">
                Trễ {Math.max(1, Math.floor((nowTime - new Date(overdueReminders[0].scheduled_time).getTime()) / 60000))} phút
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {overdueReminders.map((med) => (
                <div key={med.id} className="bg-white rounded-2xl p-3 border border-red-100 flex items-center justify-between shadow-xs">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-red-600 font-black text-sm shrink-0">
                        {new Date(med.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-gray-300">•</span>
                      <h4 className="text-[#1a2b4b] font-black text-sm truncate">{med.medication?.name || "Thuốc"}</h4>
                    </div>
                    <p className="text-gray-600 text-xs font-medium truncate">
                      {med.medication?.dosage} • {med.medication?.instructions}
                    </p>
                  </div>

                  <button
                    onClick={() => handleTakeMedication(med.id)}
                    disabled={takingId === med.id}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/20 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {takingId === med.id ? <Loader2 size={13} className="animate-spin" /> : null}
                    <span>UỐNG NGAY</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. MỤC THUỐC TIẾP THEO (CHỈ HIỂN THỊ CỮ THUỐC SẮP TỚI) */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
            <h3 className="text-[#1a2b4b] font-bold text-sm">
              Thuốc tiếp theo {upcomingReminders.length > 0 ? "(Sắp tới)" : ""}
            </h3>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden min-h-[190px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6">
                <Loader2 size={28} className="text-primary animate-spin mb-2" />
                <p className="text-gray-500 text-xs">Đang tải lịch thuốc...</p>
              </div>
            ) : nextReminder ? (
              <>
                <p className="text-primary font-bold mb-1 text-base flex items-center gap-1.5">
                  <Clock size={16} />
                  <span>
                    {new Date(nextReminder.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} 
                    {new Date(nextReminder.scheduled_time).getHours() >= 12 ? ' chiều' : ' sáng'}
                  </span>
                </p>
                <h2 className="text-[#1a2b4b] font-black text-2xl mb-1 w-[68%] leading-tight truncate">
                  {nextReminder.medication?.name || "Thuốc không tên"}
                </h2>
                <p className="text-gray-600 text-sm font-medium w-[68%] leading-snug line-clamp-2">
                  {nextReminder.medication?.dosage} • {nextReminder.medication?.instructions}
                </p>

                <div className="absolute right-3 top-5">
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl shadow-inner border border-gray-100 overflow-hidden flex items-center justify-center">
                    {nextReminder.medication?.image_url ? (
                      <img src={nextReminder.medication.image_url} alt="Ảnh thuốc" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">💊</span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <button 
                    onClick={() => handleTakeMedication(nextReminder.id)}
                    disabled={takingId === nextReminder.id}
                    className="w-full bg-primary hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-base shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all tracking-wide disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {takingId === nextReminder.id ? <Loader2 size={20} className="animate-spin" /> : null}
                    <span>{takingId === nextReminder.id ? "ĐANG LƯU..." : "UỐNG SỚM / ĐÃ UỐNG"}</span>
                  </button>
                </div>
              </>
            ) : overdueReminders.length > 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-5 text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-2 text-amber-600">
                  <Clock size={24} />
                </div>
                <h3 className="text-base font-bold text-[#1a2b4b] mb-1">Không còn cữ thuốc nào khác</h3>
                <p className="text-gray-500 text-xs">Vui lòng uống cữ thuốc quá giờ ở khung cảnh báo phía trên.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-5 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-2 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#1a2b4b] mb-1">Tuyệt vời!</h3>
                <p className="text-gray-500 text-xs">Bác đã hoàn thành tất cả các cữ thuốc hôm nay.</p>
              </div>
            )}
          </div>
        </div>

        {/* SOS + AI Scan Row */}
        <div className="flex gap-3 mt-auto pt-1">
          <div 
            onClick={() => setIsSOSOpen(true)}
            className="flex-[3] bg-[#FFF0F0] rounded-2xl p-3.5 flex items-center gap-3 border border-[#FFD6D6] shadow-sm cursor-pointer active:scale-[0.98] transition-all select-none"
          >
            <div className="w-11 h-11 bg-danger rounded-xl text-white flex flex-col items-center justify-center shadow-sm shrink-0">
              <AlertCircle size={22} strokeWidth={2.5} />
              <span className="text-[9px] font-bold mt-0.5 leading-none">SOS</span>
            </div>
            <div>
              <h3 className="text-danger font-bold text-sm leading-tight">SOS khẩn cấp</h3>
              <p className="text-danger/80 text-xs mt-0.5 leading-tight">Gọi người thân ngay lập tức</p>
            </div>
          </div>

          <div 
            onClick={() => setIsScanUnknownOpen(true)}
            className="flex-[1] bg-[#EBF1FF] hover:bg-blue-100 rounded-2xl flex flex-col items-center justify-center border border-blue-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all p-2 select-none"
          >
            <Scan className="text-primary mb-1" size={24} />
            <span className="text-primary font-bold text-[11px] text-center leading-tight">Quét AI</span>
          </div>
        </div>
      </div>
    </>
  );
}
