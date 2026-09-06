import { useState, useEffect } from "react";
import { Calendar, Volume2, Scan, AlertCircle, Loader2, Bell } from "lucide-react";
import { Lunar } from "lunar-javascript";
import SOSModal from "./screens/SOSModal";
import MedicationAlertScreen from "./screens/MedicationAlertScreen";
import { getTodaySchedule, markAsTaken, type Reminder } from "./services/medicationService";
import { unlockAudio, announceMedication } from "./utils/voiceAssistant";
import { supabase } from "./lib/supabase";

interface Props {
  user: any;
  onLogout: () => void;
}

export default function HomeScreen({ user }: Props) {
  const userName = user?.user_metadata?.full_name || "Ã”ng/BÃ ";
  const patientId = user?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingId, setTakingId] = useState<string | null>(null);

  // Alarm and audio state
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [alertMed, setAlertMed] = useState<Reminder | null>(null);

  useEffect(() => {
    if (patientId) {
      loadSchedule();

      const channel = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `patient_id=eq.${patientId}` }, () => {
          loadSchedule();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `patient_id=eq.${patientId}` }, () => {
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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);

      // Check alarms only if audio is unlocked
      if (isAudioUnlocked && schedule.length > 0 && !alertMed) {
        const nextPending = schedule.find(r => r.status === 'pending');
        if (nextPending) {
          const scheduledTime = new Date(nextPending.scheduled_time);
          if (
            now.getHours() === scheduledTime.getHours() &&
            now.getMinutes() === scheduledTime.getMinutes() &&
            now.getSeconds() === 0 // Trigger precisely on the minute
          ) {
            setAlertMed(nextPending);
            announceMedication(
              nextPending.medication?.name || "Thuá»‘c",
              nextPending.medication?.dosage || "1 liá»u"
            );
          }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule, isAudioUnlocked, alertMed]);

  const handleTakeMedication = async (reminderId: string) => {
    try {
      setTakingId(reminderId);
      await markAsTaken(reminderId);
      await loadSchedule();
      setAlertMed(null);
    } catch (error) {
      console.error("Failed to mark as taken:", error);
      alert("CÃ³ lá»—i xáº£y ra, vui lÃ²ng thá»­ láº¡i!");
    } finally {
      setTakingId(null);
    }
  };

  const lunar = Lunar.fromDate(currentDate);
  const dayOfWeek = ["Chá»§ Nháº­t", "Thá»© Hai", "Thá»© Ba", "Thá»© TÆ°", "Thá»© NÄƒm", "Thá»© SÃ¡u", "Thá»© Báº£y"][currentDate.getDay()];
  const dateString = `${dayOfWeek}, ${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const timeString = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
  const lunarString = `(NgÃ y ${String(lunar.getDay()).padStart(2, '0')} thÃ¡ng ${String(lunar.getMonth()).padStart(2, '0')} Ã‚m lá»‹ch)`;

  const nextReminder = schedule.find(r => r.status === 'pending');

  return (
    <>
      <SOSModal 
        isOpen={isSOSOpen} 
        onClose={() => setIsSOSOpen(false)} 
        contactName="NgÆ°á»i thÃ¢n" 
      />

      {alertMed && (
        <MedicationAlertScreen
          medicine={{
            name: alertMed.medication?.name || "Thuá»‘c",
            dosage: alertMed.medication?.dosage || "1 liá»u",
            instruction: alertMed.medication?.instructions || "Theo chá»‰ dáº«n",
            time: new Date(alertMed.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }}
          onTaken={() => handleTakeMedication(alertMed.id)}
          onSnooze={() => setAlertMed(null)}
        />
      )}
      
      <div className="p-5 flex flex-col gap-4">
        {/* Audio unlock button - LÃ¡ch luáº­t Autoplay */}
        {!isAudioUnlocked && (
          <button 
            onClick={() => {
              unlockAudio();
              setIsAudioUnlocked(true);
            }}
            className="w-full bg-[#EBF1FF] border-2 border-primary text-primary py-3 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 animate-bounce"
          >
            <Bell size={18} className="fill-primary" /> Báº­t chuÃ´ng nháº¯c nhá»Ÿ hÃ´m nay
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm shrink-0">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">ChÃ o buá»•i sÃ¡ng,</p>
            <h1 className="text-lg font-bold text-[#1a2b4b]">{userName} ðŸ‘‹</h1>
          </div>
        </div>

        {/* Date/Time Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#EBF1FF] flex items-center justify-center shrink-0">
              <Calendar size={24} className="text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[#1a2b4b] font-bold text-2xl mb-0.5">{timeString}</h2>
              <p className="text-[#1a2b4b] font-semibold text-base">{dateString}</p>
              <p className="text-gray-500 text-sm mt-0.5">{lunarString}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (nextReminder) {
                announceMedication(nextReminder.medication?.name || "Thuá»‘c", nextReminder.medication?.dosage || "");
              }
            }}
            className="w-12 h-12 rounded-full bg-[#EBF1FF] flex items-center justify-center shrink-0 active:scale-95 transition-all"
          >
            <Volume2 size={24} className="text-primary" strokeWidth={2.5} />
          </button>
        </div>

        {/* Next Medication */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
            <h3 className="text-[#1a2b4b] font-bold text-base">Thuá»‘c tiáº¿p theo</h3>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden min-h-[220px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 size={32} className="text-primary animate-spin mb-2" />
                <p className="text-gray-500">Äang táº£i lá»‹ch thuá»‘c...</p>
              </div>
            ) : nextReminder ? (
              <>
                <p className="text-primary font-bold mb-2 text-xl">
                  {new Date(nextReminder.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} 
                  {new Date(nextReminder.scheduled_time).getHours() >= 12 ? ' chiá»u' : ' sÃ¡ng'}
                </p>
                <h2 className="text-[#1a2b4b] font-black text-4xl mb-3 w-[65%] leading-tight truncate">
                  {nextReminder.medication?.name || "Thuá»‘c khÃ´ng tÃªn"}
                </h2>
                <p className="text-gray-700 text-lg font-medium w-[65%] leading-snug line-clamp-2">
                  {nextReminder.medication?.dosage} â€¢ {nextReminder.medication?.instructions}
                </p>

                <div className="absolute right-[-15px] top-6">
                  <div className="w-32 h-32 bg-gray-50 rounded-full shadow-inner border border-gray-100 overflow-hidden flex items-center justify-center">
                    {nextReminder.medication?.image_url ? (
                      <img src={nextReminder.medication.image_url} alt="áº¢nh thuá»‘c" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">ðŸ’Š</span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-8">
                  <button 
                    onClick={() => handleTakeMedication(nextReminder.id)}
                    disabled={takingId === nextReminder.id}
                    className="w-full bg-success text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-green-200 active:scale-[0.98] transition-all tracking-wide disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {takingId === nextReminder.id ? <Loader2 size={24} className="animate-spin" /> : null}
                    {takingId === nextReminder.id ? "ÄANG LÆ¯U..." : "Äáº¾N GIá»œ Uá»NG THUá»C"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">ðŸŽ‰</span>
                </div>
                <h3 className="text-xl font-bold text-[#1a2b4b] text-center mb-1">Tuyá»‡t vá»i!</h3>
                <p className="text-gray-500 text-center">BÃ /Ã”ng Ä‘Ã£ uá»‘ng xong táº¥t cáº£ cÃ¡c cá»¯ thuá»‘c hÃ´m nay.</p>
              </div>
            )}
          </div>
        </div>

        {/* SOS + AI Row */}
        <div className="flex gap-3 mt-auto">
          <div 
            onClick={() => setIsSOSOpen(true)}
            className="flex-[3] bg-[#FFF0F0] rounded-2xl p-4 flex items-center gap-4 border border-[#FFD6D6] shadow-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 bg-danger rounded-xl text-white flex flex-col items-center justify-center shadow-sm shrink-0">
              <AlertCircle size={24} strokeWidth={2.5} />
              <span className="text-[10px] font-bold mt-0.5 leading-none">SOS</span>
            </div>
            <div>
              <h3 className="text-danger font-bold text-base leading-tight">SOS kháº©n cáº¥p</h3>
              <p className="text-danger/80 text-sm mt-1 leading-tight">Gá»i ngÆ°á»i thÃ¢n ngay láº­p tá»©c</p>
            </div>
          </div>
          <div className="flex-[1] bg-[#EBF1FF] rounded-2xl flex flex-col items-center justify-center border border-blue-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all p-2">
            <Scan className="text-primary mb-1" size={28} />
            <span className="text-primary font-bold text-[11px] text-center leading-tight">QuÃ©t AI</span>
          </div>
        </div>
      </div>
    </>
  );
}

