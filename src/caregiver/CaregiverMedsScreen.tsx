import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Scan, 
  Phone, 
  Trash2, 
  Edit3,
  Loader2, 
  CalendarCheck,
  Pill,
  Clock,
  FileText,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  Camera,
  X,
  Check
} from "lucide-react";
import { Lunar } from "lunar-javascript";
import { cn } from "../lib/utils";
import { useFamily } from "../contexts/FamilyContext";
import { 
  getScheduleByDate, 
  getScheduleDaysSummary, 
  markAsTaken, 
  deleteMedication,
  updateMedicationCourse,
  getActiveMedications,
  getDiagnosisRecords,
  saveDiagnosisRecord,
  deleteDiagnosisRecord,
  getMedicationTimingOffset,
  type Reminder,
  type ActiveMedicationItem,
  type DiagnosisRecord
} from "../services/medicationService";
import { supabase } from "../lib/supabase";

interface Props {
  onOpenCall: () => void;
  onOpenScan: () => void;
  onOpenAddMed: () => void;
}

export default function CaregiverMedsScreen({
  onOpenCall,
  onOpenScan,
  onOpenAddMed
}: Props) {
  const { linkedPatientId: patientId, patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Người thân");
  
  // Tab chính: "calendar" (Lịch theo ngày) hoặc "course_list" (Lộ trình & Tủ thuốc)
  const [activeMainTab, setActiveMainTab] = useState<"calendar" | "course_list">("calendar");

  // Dữ liệu cho tab Lịch theo ngày
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [schedule, setSchedule] = useState<Reminder[]>([]);
  const [daysSummary, setDaysSummary] = useState<Record<string, { count: number; allTaken: boolean; hasPending: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Dữ liệu cho tab Danh sách thuốc & Lộ trình
  const [activeMeds, setActiveMeds] = useState<ActiveMedicationItem[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);

  // Modal xác nhận xóa cữ thuốc
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    reminderId: string;
    medicationId?: string;
    medName: string;
    timeStr: string;
  } | null>(null);

  // In-app Modal xác nhận hủy toàn bộ lộ trình thuốc (thay thế window.confirm)
  const [confirmCourseDelete, setConfirmCourseDelete] = useState<{
    medId: string;
    medName: string;
  } | null>(null);

  // Modal Sửa lộ trình thuốc
  const [editingCourse, setEditingCourse] = useState<ActiveMedicationItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editDailyTimes, setEditDailyTimes] = useState<string[]>(["08:00", "20:00"]);
  const [newTimeInput, setNewTimeInput] = useState("12:00");
  const [editDurationDays, setEditDurationDays] = useState(7);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal Thêm chẩn đoán / Tiền sử bệnh
  const [isAddingDiagnosis, setIsAddingDiagnosis] = useState(false);
  const [newDiagHospital, setNewDiagHospital] = useState("");
  const [newDiagTitle, setNewDiagTitle] = useState("");
  const [newDiagDoctor, setNewDiagDoctor] = useState("");
  const [newDiagDate, setNewDiagDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDiagRevisitDays, setNewDiagRevisitDays] = useState(30);
  const [isSavingDiag, setIsSavingDiag] = useState(false);

  // Modal xem ảnh minh chứng vỉ thuốc đã uống
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<{
    url: string;
    medName: string;
    timeStr: string;
    timingLabel?: string;
  } | null>(null);

  // Dải ngày chọn nhanh (Từ 3 ngày trước đến 10 ngày tới)
  const dateStrip = useMemo(() => {
    const list: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = -3; i <= 10; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const loadData = async () => {
    if (!patientId) {
      setSchedule([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getScheduleByDate(patientId, selectedDate);
      setSchedule(data);

      const start = dateStrip[0];
      const end = dateStrip[dateStrip.length - 1];
      const summary = await getScheduleDaysSummary(patientId, start, end);
      setDaysSummary(summary);
    } catch (err) {
      console.error("Failed to load caregiver meds schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async () => {
    if (!patientId) {
      setActiveMeds([]);
      setDiagnoses([]);
      return;
    }

    try {
      setLoadingMeds(true);
      const [meds, diagList] = await Promise.all([
        getActiveMedications(patientId),
        Promise.resolve(getDiagnosisRecords(patientId))
      ]);
      setActiveMeds(meds);
      setDiagnoses(diagList);
    } catch (err) {
      console.error("Failed to load course medications:", err);
    } finally {
      setLoadingMeds(false);
    }
  };

  useEffect(() => {
    loadData();

    if (patientId) {
      const channelName = `caregiver-meds-${patientId}-${Date.now()}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `patient_id=eq.${patientId}` }, () => {
          loadData();
          loadCourseData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `patient_id=eq.${patientId}` }, () => {
          loadData();
          loadCourseData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [patientId, selectedDate]);

  useEffect(() => {
    if (activeMainTab === "course_list") {
      loadCourseData();
    }
  }, [activeMainTab, patientId]);

  const handleToggleTaken = async (reminderId: string, currentStatus: string) => {
    try {
      setMarkingId(reminderId);
      if (currentStatus !== 'taken') {
        await markAsTaken(reminderId);
      } else {
        await supabase
          .from('reminders')
          .update({ status: 'pending', taken_at: null })
          .eq('id', reminderId);
      }
      await loadData();
    } catch (err) {
      console.error("Failed to update reminder status:", err);
    } finally {
      setMarkingId(null);
    }
  };

  // 1. Xóa duy nhất 1 cữ trong ngày
  const handleDeleteSingleReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);
      if (error) throw error;
      setDeleteConfirmModal(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
      alert("Không thể xóa cữ thuốc. Vui lòng thử lại!");
    }
  };

  // 2. Mở modal sửa lộ trình
  const handleOpenEditCourse = (med: ActiveMedicationItem) => {
    setEditingCourse(med);
    setEditName(med.name || "");
    setEditDosage(med.dosage || "");
    setEditInstructions(med.instructions || "");
    setEditDailyTimes(["08:00", "20:00"]);
    setEditDurationDays(7);
  };

  const handleSaveEditCourse = async () => {
    if (!editingCourse || !patientId || !editName.trim()) {
      alert("Vui lòng nhập tên thuốc!");
      return;
    }
    try {
      setIsSavingEdit(true);
      await updateMedicationCourse({
        medicationId: editingCourse.id,
        patientId,
        name: editName.trim(),
        dosage: editDosage.trim(),
        instructions: editInstructions.trim(),
        dailyTimes: editDailyTimes.length > 0 ? editDailyTimes : undefined,
        durationDays: editDurationDays
      });
      setEditingCourse(null);
      await Promise.all([loadData(), loadCourseData()]);
      alert("Đã cập nhật lộ trình thuốc thành công!");
    } catch (err) {
      console.error("Failed to update medication course:", err);
      alert("Không thể cập nhật lộ trình. Vui lòng thử lại!");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 3. Thực hiện xóa toàn bộ thuốc & mọi cữ nhắc
  const handleExecuteDeleteCourse = async (medicationId: string, _medName?: string) => {
    try {
      setDeletingMedId(medicationId);
      // Optimistic update
      setActiveMeds(prev => prev.filter(m => m.id !== medicationId));
      setSchedule(prev => prev.filter(r => r.medication_id !== medicationId));
      setConfirmCourseDelete(null);
      setDeleteConfirmModal(null);

      await deleteMedication(medicationId);
      await Promise.all([loadData(), loadCourseData()]);
    } catch (err) {
      console.error("Failed to delete entire course:", err);
      alert("Không thể xóa lộ trình thuốc. Vui lòng thử lại!");
      loadCourseData();
    } finally {
      setDeletingMedId(null);
    }
  };

  // 4. Thêm chẩn đoán vào tiền sử bệnh
  const handleSaveNewDiagnosis = async () => {
    if (!patientId || !newDiagTitle.trim()) {
      alert("Vui lòng nhập tên bệnh lý hoặc chẩn đoán!");
      return;
    }
    try {
      setIsSavingDiag(true);
      await saveDiagnosisRecord(patientId, {
        diagnosis: newDiagTitle.trim(),
        hospitalName: newDiagHospital.trim() || "Bệnh viện / Phòng khám",
        doctorName: newDiagDoctor.trim() || "Bác sĩ điều trị",
        date: newDiagDate ? new Date(newDiagDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
        revisitDays: Number(newDiagRevisitDays) || 30
      });
      setDiagnoses(getDiagnosisRecords(patientId));
      setIsAddingDiagnosis(false);
      setNewDiagTitle("");
      setNewDiagHospital("");
      setNewDiagDoctor("");
    } catch (err) {
      console.error("Failed to save diagnosis:", err);
      alert("Không thể lưu chẩn đoán. Vui lòng thử lại!");
    } finally {
      setIsSavingDiag(false);
    }
  };

  const handleDeleteDiagnosis = (diagId: string) => {
    if (!patientId) return;
    deleteDiagnosisRecord(patientId, diagId);
    setDiagnoses(getDiagnosisRecords(patientId));
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const lunar = Lunar.fromDate(selectedDate);
  const dayOfWeekNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = dayOfWeekNames[selectedDate.getDay()];
  const formattedSolarDate = `${dayName}, ${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`;
  const formattedLunarDate = `(Ngày ${String(lunar.getDay()).padStart(2, '0')}/${String(lunar.getMonth()).padStart(2, '0')} Âm lịch)`;

  const filteredMeds = schedule.filter(med => {
    if (activeFilter === "Tất cả") return true;
    const hour = new Date(med.scheduled_time).getHours();
    let period = "Sáng";
    if (hour >= 11 && hour <= 14) period = "Trưa";
    else if (hour > 14 && hour <= 20) period = "Tối";
    else if (hour > 20) period = "Trước ngủ";
    return period === activeFilter;
  });

  const takenCount = schedule.filter(s => s.status === 'taken').length;
  const totalCount = schedule.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 sm:p-5 flex flex-col min-h-full bg-[#F4F7FB] pb-28 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 mt-1">
        <div>
          <h1 className="text-2xl font-black text-[#1a2b4b]">Quản Lý Thuốc & Lộ Trình</h1>
          <p className="text-xs text-gray-500 font-semibold">
            Theo dõi liều lượng, giờ uống & tiền sử bệnh của <span className="text-primary font-bold">{patientName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenCall}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Gọi video/thoại cho người bệnh"
          >
            <Phone size={15} />
            <span className="hidden sm:inline">Gọi điện</span>
          </button>
          <button 
            onClick={onOpenScan}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 px-3 py-2 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Quét đơn thuốc bác sĩ bằng AI"
          >
            <Scan size={15} />
            <span>Quét đơn AI</span>
          </button>
          <button 
            onClick={onOpenAddMed}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-2xl font-bold text-xs shadow-md shadow-primary/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Thêm thuốc</span>
          </button>
        </div>
      </div>

      {/* CHUYỂN ĐỔI TAB GIAO DIỆN (LỊCH THEO NGÀY VS LỘ TRÌNH & TỦ THUỐC) */}
      <div className="grid grid-cols-2 bg-gray-200/80 p-1.5 rounded-2xl mb-4 border border-gray-300/60 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMainTab("calendar")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer",
            activeMainTab === "calendar"
              ? "bg-white text-primary shadow-md shadow-black/5"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <CalendarIcon size={16} />
          <span>Lịch uống theo ngày</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("course_list")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer relative",
            activeMainTab === "course_list"
              ? "bg-white text-primary shadow-md shadow-black/5"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Pill size={16} />
          <span>Thuốc & Lộ trình</span>
          {activeMeds.length > 0 && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-black",
              activeMainTab === "course_list" ? "bg-primary text-white" : "bg-gray-300 text-gray-700"
            )}>
              {activeMeds.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: LỊCH UỐNG THEO NGÀY */}
      {activeMainTab === "calendar" && (
        <>

      {/* THANH CHỌN NGÀY TRỰC QUAN CHO NGƯỜI CHĂM SÓC */}
      <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-gray-100 mb-3.5">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-primary" />
            <span className="text-sm font-black text-[#1a2b4b]">
              Tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
            </span>
          </div>

          {!isToday(selectedDate) && (
            <button
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setSelectedDate(today);
              }}
              className="text-xs font-bold text-primary bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Về hôm nay
            </button>
          )}
        </div>

        {/* Dải ngày */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {dateStrip.map((d) => {
            const isSelected = isSameDay(d, selectedDate);
            const todayFlag = isToday(d);
            const dayStr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
            const solarNum = d.getDate();
            const lunarObj = Lunar.fromDate(d);
            const lunarNum = lunarObj.getDay();

            const dateKey = d.toISOString().split('T')[0];
            const dayInfo = daysSummary[dateKey];

            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[58px] py-2.5 px-1 rounded-2xl border-2 transition-all cursor-pointer shrink-0 relative",
                  isSelected 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105" 
                    : "bg-gray-50/80 text-gray-600 border-gray-100 hover:bg-gray-100/70"
                )}
              >
                {todayFlag && (
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full mb-0.5",
                    isSelected ? "bg-white text-primary" : "bg-primary text-white"
                  )}>
                    Hôm nay
                  </span>
                )}

                <span className={cn("text-[11px] font-bold", isSelected ? "text-white/90" : "text-gray-400")}>
                  {dayStr}
                </span>

                <span className={cn("text-lg font-black leading-tight my-0.5", isSelected ? "text-white" : "text-[#1a2b4b]")}>
                  {String(solarNum).padStart(2, '0')}
                </span>

                <span className={cn("text-[9px] font-semibold", isSelected ? "text-white/80" : "text-gray-400")}>
                  Âm {lunarNum}
                </span>

                {dayInfo && dayInfo.count > 0 && (
                  <div className="absolute -bottom-1 flex items-center justify-center">
                    <span className={cn(
                      "w-2 h-2 rounded-full ring-2 ring-white",
                      dayInfo.allTaken ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                    )} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Card của ngày được chọn */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-4 text-white shadow-lg shadow-blue-600/20 mb-3.5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Tiến độ uống thuốc</span>
          <h3 className="text-xl font-black">
            {takenCount} / {totalCount} cữ đã uống
          </h3>
          <p className="text-xs text-blue-100">{formattedSolarDate}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg border border-white/30">
          {progressPercent}%
        </div>
      </div>

      {/* Bộ lọc buổi */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 mb-3 no-scrollbar">
        {["Tất cả", "Sáng", "Trưa", "Tối", "Trước ngủ"].map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <button 
              key={filter} 
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-5 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-colors border-2 shrink-0 active:scale-95 cursor-pointer",
                isActive ? "bg-[#1a2b4b] text-white border-[#1a2b4b] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              )}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Danh sách thuốc */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mb-4">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-primary" />
            <h3 className="font-extrabold text-[#1a2b4b] text-sm sm:text-base">
              Chi tiết các cữ thuốc ({filteredMeds.length})
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">{formattedLunarDate}</span>
        </div>

        <div className="p-4 flex flex-col gap-3 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-70">
              <Loader2 size={36} className="text-primary animate-spin mb-2" />
              <p className="text-gray-500 font-bold text-sm">Đang tải lịch thuốc...</p>
            </div>
          ) : filteredMeds.length > 0 ? (
            filteredMeds.map((med) => {
              const isDone = med.status === 'taken';
              const d = new Date(med.scheduled_time);
              const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const timingOffset = isDone && med.taken_at 
                ? getMedicationTimingOffset(med.scheduled_time, med.taken_at)
                : null;
              const proofUrl = (med as any).proof_image_url;

              return (
                <div 
                  key={med.id} 
                  className={cn(
                    "border-2 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all",
                    isDone ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-gray-200 hover:border-blue-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs shrink-0",
                      isDone ? "bg-emerald-100 text-emerald-800" : "bg-blue-50 text-primary"
                    )}>
                      <span>{timeStr}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm sm:text-base text-[#1a2b4b] leading-tight">
                        {med.medication?.name || "Thuốc"}
                      </span>
                      <span className="text-xs text-primary font-bold mt-0.5">
                        Liều: {med.medication?.dosage || "1 liều"}
                      </span>
                      {med.medication?.instructions && (
                        <span className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                          {med.medication.instructions}
                        </span>
                      )}

                      {/* Độ lệch giờ uống thực tế */}
                      {isDone && timingOffset && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full border",
                            timingOffset.badgeColor === "emerald"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : timingOffset.badgeColor === "rose"
                              ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-black"
                              : "bg-amber-100 text-amber-800 border-amber-300 font-bold"
                          )}>
                            {timingOffset.label}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            (Uống lúc: {new Date(med.taken_at!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        </div>
                      )}

                      {/* Nút xem ảnh minh chứng vỉ thuốc */}
                      {proofUrl && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingPhotoUrl({
                              url: proofUrl,
                              medName: med.medication?.name || "Thuốc",
                              timeStr,
                              timingLabel: timingOffset?.label
                            })}
                            className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl text-[11px] font-bold active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            <Camera size={13} />
                            <span>📸 Xem ảnh vỉ thuốc</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleTaken(med.id, med.status)}
                      disabled={markingId === med.id}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer",
                        isDone 
                          ? "bg-emerald-600 text-white shadow-sm" 
                          : "bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 border border-gray-200"
                      )}
                    >
                      {markingId === med.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      <span>{isDone ? "Đã uống" : "Đánh dấu"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setDeleteConfirmModal({
                          reminderId: med.id,
                          medicationId: med.medication_id,
                          medName: med.medication?.name || "Thuốc",
                          timeStr
                        });
                      }}
                      className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Tùy chọn xóa cữ hoặc toàn bộ lộ trình"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 size={40} className="text-gray-300 mb-2" strokeWidth={1.5} />
              <p className="font-bold text-gray-600 text-sm">Không có cữ thuốc nào trong ngày này</p>
              <p className="text-xs text-gray-400 mt-0.5">Hãy bấm "Thêm thuốc" hoặc "Quét đơn AI" để lên lịch</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* TAB 2: DANH SÁCH THUỐC, LỘ TRÌNH ĐIỀU TRỊ & TIỀN SỬ BỆNH */}
      {activeMainTab === "course_list" && (
        <div className="space-y-4">
          
          {/* Section A: Danh sách các loại thuốc đang uống / Lộ trình */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-primary" />
                <h3 className="font-extrabold text-[#1a2b4b] text-base">
                  Danh sách thuốc đang dùng ({activeMeds.length})
                </h3>
              </div>
              <span className="text-xs font-bold text-gray-400">
                1-Click xóa toàn bộ lộ trình
              </span>
            </div>

            <div className="p-4 flex flex-col gap-3.5">
              {loadingMeds ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-70">
                  <Loader2 size={36} className="text-primary animate-spin mb-2" />
                  <p className="text-gray-500 font-bold text-sm">Đang tải danh sách thuốc...</p>
                </div>
              ) : activeMeds.length > 0 ? (
                activeMeds.map((med) => {
                  const isPRN = med.instructions?.includes("[Thuốc dùng khi đau / SOS]");
                  const isDeleting = deletingMedId === med.id;

                  return (
                    <div 
                      key={med.id}
                      className="bg-white border-2 border-gray-200/90 rounded-2xl p-4 flex flex-col gap-3 shadow-xs hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-black text-[#1a2b4b]">
                              {med.name}
                            </h4>
                            {isPRN ? (
                              <span className="text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span>🟡 Dùng khi đau (PRN)</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck size={12} />
                                <span>Đang điều trị</span>
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs font-bold text-primary">
                            Liều dùng: <span className="font-semibold text-gray-700">{med.dosage || "Theo đơn"}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Nút Sửa lộ trình */}
                          <button
                            onClick={() => handleOpenEditCourse(med)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-primary bg-blue-50 hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all cursor-pointer shadow-2xs"
                            title="Chỉnh sửa liều lượng, chỉ định, và giờ nhắc"
                          >
                            <Edit3 size={13} />
                            <span>Sửa</span>
                          </button>

                          {/* Nút Hủy toàn bộ lộ trình thuốc 1 chạm qua In-App Modal */}
                          <button
                            onClick={() => setConfirmCourseDelete({ medId: med.id, medName: med.name })}
                            disabled={isDeleting}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all cursor-pointer shadow-2xs"
                            title="Hủy thuốc và xóa tất cả cữ nhắc trên mọi ngày"
                          >
                            {isDeleting ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            <span>Hủy</span>
                          </button>
                        </div>
                      </div>

                      {/* Hướng dẫn & Ghi chú lộ trình */}
                      {med.instructions && (
                        <div className="bg-gray-50/90 rounded-xl p-2.5 border border-gray-200/70 text-xs text-gray-600">
                          <span className="font-bold text-[#1a2b4b] block mb-0.5">Chỉ định bác sĩ:</span>
                          <p className="line-clamp-2">{med.instructions}</p>
                        </div>
                      )}

                      {/* Thống kê tiến độ cữ nhắc */}
                      {!isPRN && (
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 text-center">
                          <div className="bg-blue-50/60 rounded-xl py-1.5 px-2">
                            <span className="text-[10px] text-gray-500 font-bold block">Tổng cữ</span>
                            <span className="text-sm font-black text-primary">{med.totalReminders || 0}</span>
                          </div>
                          <div className="bg-emerald-50/60 rounded-xl py-1.5 px-2">
                            <span className="text-[10px] text-gray-500 font-bold block">Đã uống</span>
                            <span className="text-sm font-black text-emerald-600">{med.takenReminders || 0}</span>
                          </div>
                          <div className="bg-amber-50/60 rounded-xl py-1.5 px-2">
                            <span className="text-[10px] text-gray-500 font-bold block">Chưa uống</span>
                            <span className="text-sm font-black text-amber-600">{med.pendingReminders || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Pill size={36} className="text-gray-300 mb-2" strokeWidth={1.5} />
                  <p className="font-bold text-gray-700 text-sm">Chưa có thuốc nào trong lộ trình</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Hãy bấm nút "Quét đơn AI" phía trên để nhập đơn thuốc của bác sĩ với đầy đủ liều lượng và chẩn đoán.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Tiền sử bệnh & Chẩn đoán từ đơn thuốc */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HeartPulse size={18} className="text-rose-500" />
                <h3 className="font-extrabold text-[#1a2b4b] text-base">
                  Tiền sử bệnh & Chẩn đoán ({diagnoses.length})
                </h3>
              </div>
              <button
                onClick={() => setIsAddingDiagnosis(true)}
                className="flex items-center gap-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-xl active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={13} strokeWidth={3} />
                <span>Thêm chẩn đoán</span>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {diagnoses.length > 0 ? (
                diagnoses.map((diag) => (
                  <div 
                    key={diag.id}
                    className="border-2 border-indigo-100 bg-indigo-50/30 rounded-2xl p-3.5 flex flex-col gap-2 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                          <FileText size={12} />
                          <span>{diag.hospital_name || "Bệnh viện / Phòng khám"}</span>
                        </span>
                        <h4 className="text-sm font-black text-rose-700 leading-snug">
                          {diag.diagnosis}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleDeleteDiagnosis(diag.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa bản ghi này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-indigo-100/60 font-medium">
                      <span>BS: {diag.doctor_name || "Bác sĩ điều trị"}</span>
                      <span>Ngày khám: {diag.date}</span>
                    </div>

                    {diag.revisit_days && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-bold border border-amber-200/80 w-fit">
                        <Clock size={12} />
                        <span>Hẹn tái khám sau {diag.revisit_days} ngày</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText size={32} className="text-gray-300 mb-2" strokeWidth={1.5} />
                  <p className="font-bold text-gray-600 text-sm">Chưa có chẩn đoán y tế nào</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Khi bạn quét đơn thuốc có mục Chẩn đoán, hệ thống sẽ tự động cập nhật vào tiền sử bệnh tại đây.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* POPUP MODAL XÁC NHẬN XÓA CỮ THUỐC / LỘ TRÌNH */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-black text-base">
                <AlertTriangle size={20} />
                <span>Tùy chọn xóa thuốc</span>
              </div>
              <button 
                onClick={() => setDeleteConfirmModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <p>Bạn đang chọn thuốc: <strong className="text-[#1a2b4b] text-sm block">{deleteConfirmModal.medName}</strong></p>
              <p>Cữ uống lúc: <strong>{deleteConfirmModal.timeStr}</strong></p>
              <p className="text-gray-500 pt-1">Vui lòng chọn phạm vi xóa:</p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Lựa chọn 1: Chỉ xóa cữ hôm nay */}
              <button
                type="button"
                onClick={() => handleDeleteSingleReminder(deleteConfirmModal.reminderId)}
                className="w-full py-3 px-4 rounded-2xl border-2 border-gray-200 hover:border-blue-500 bg-gray-50 hover:bg-blue-50/50 text-[#1a2b4b] font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <span>Chỉ xóa cữ này ({deleteConfirmModal.timeStr})</span>
                <Trash2 size={14} className="text-gray-400" />
              </button>

              {/* Lựa chọn 2: Hủy toàn bộ lộ trình của thuốc */}
              {deleteConfirmModal.medicationId && (
                <button
                  type="button"
                  onClick={() => {
                    const medId = deleteConfirmModal.medicationId!;
                    const medName = deleteConfirmModal.medName;
                    setDeleteConfirmModal(null);
                    setConfirmCourseDelete({ medId, medName });
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 font-black text-xs flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>🚨 HỦY TOÀN BỘ LỘ TRÌNH THUỐC NÀY</span>
                  <Trash2 size={14} className="text-rose-600" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDeleteConfirmModal(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: IN-APP XÁC NHẬN HỦY TOÀN BỘ LỘ TRÌNH THUỐC */}
      {confirmCourseDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-black text-base text-[#1a2b4b]">Hủy toàn bộ lộ trình?</h3>
                <p className="text-xs text-gray-500">Xóa vĩnh viễn thuốc & mọi cữ nhắc</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-rose-900">
              <p className="font-bold">Thuốc: <span className="text-sm font-black">{confirmCourseDelete.medName}</span></p>
              <p className="leading-relaxed text-rose-800">
                Toàn bộ lịch nhắc cữ thuốc này trên tất cả các ngày sẽ bị gỡ bỏ khỏi điện thoại của <strong>{patientName}</strong>.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmCourseDelete(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer transition-all"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={!!deletingMedId}
                onClick={() => handleExecuteDeleteCourse(confirmCourseDelete.medId, confirmCourseDelete.medName)}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer active:scale-95 transition-all"
              >
                {deletingMedId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Xác nhận hủy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SỬA LỘ TRÌNH THUỐC */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                  <Edit3 size={18} />
                </div>
                <h3 className="font-black text-base text-[#1a2b4b]">Sửa lộ trình thuốc</h3>
              </div>
              <button 
                onClick={() => setEditingCourse(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Tên thuốc */}
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Tên thuốc *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-[#1a2b4b] focus:border-primary outline-hidden"
                  placeholder="Nhập tên thuốc..."
                />
              </div>

              {/* Liều dùng */}
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Liều lượng dùng</label>
                <input
                  type="text"
                  value={editDosage}
                  onChange={(e) => setEditDosage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#1a2b4b] focus:border-primary outline-hidden"
                  placeholder="Ví dụ: 1 viên sau ăn sáng"
                />
              </div>

              {/* Chỉ định / Lời dặn */}
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Chỉ định bác sĩ / Lời dặn</label>
                <textarea
                  rows={2}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1a2b4b] focus:border-primary outline-hidden"
                  placeholder="Uống sau khi ăn no 15 phút, kiêng rượu bia..."
                />
              </div>

              {/* Giờ nhắc trong ngày */}
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Giờ nhắc trong ngày ({editDailyTimes.length} cữ)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editDailyTimes.map((time, idx) => (
                    <span key={idx} className="bg-blue-50 text-primary border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Clock size={11} />
                      {time}
                      <button
                        type="button"
                        onClick={() => setEditDailyTimes(editDailyTimes.filter((_, i) => i !== idx))}
                        className="hover:text-red-500 cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTimeInput && !editDailyTimes.includes(newTimeInput)) {
                        setEditDailyTimes([...editDailyTimes, newTimeInput].sort());
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#1a2b4b] font-bold text-xs rounded-xl cursor-pointer"
                  >
                    + Thêm giờ
                  </button>
                </div>
              </div>

              {/* Số ngày lộ trình */}
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Thời gian lộ trình tiếp tục</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setEditDurationDays(days)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        editDurationDays === days
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {days} ngày
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEditCourse}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/25 cursor-pointer active:scale-95 transition-all"
              >
                {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: THÊM CHẨN ĐOÁN VÀO TIỀN SỬ BỆNH */}
      {isAddingDiagnosis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <HeartPulse size={18} />
                </div>
                <h3 className="font-black text-base text-[#1a2b4b]">Thêm chẩn đoán y tế</h3>
              </div>
              <button 
                onClick={() => setIsAddingDiagnosis(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Chẩn đoán / Bệnh lý *</label>
                <input
                  type="text"
                  value={newDiagTitle}
                  onChange={(e) => setNewDiagTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-rose-700 focus:border-rose-500 outline-hidden"
                  placeholder="Ví dụ: Tăng huyết áp vô căn, Đái tháo đường..."
                />
              </div>

              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Bệnh viện / Cơ sở y tế</label>
                <input
                  type="text"
                  value={newDiagHospital}
                  onChange={(e) => setNewDiagHospital(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1a2b4b] focus:border-primary outline-hidden"
                  placeholder="Bệnh viện Bạch Mai, BV Chợ Rẫy, BV HeyMedi..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1a2b4b] block mb-1">Bác sĩ khám</label>
                  <input
                    type="text"
                    value={newDiagDoctor}
                    onChange={(e) => setNewDiagDoctor(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-[#1a2b4b] focus:border-primary outline-hidden"
                    placeholder="BS. Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1a2b4b] block mb-1">Ngày khám</label>
                  <input
                    type="date"
                    value={newDiagDate}
                    onChange={(e) => setNewDiagDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-[#1a2b4b] focus:border-primary outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1a2b4b] block mb-1">Hẹn tái khám sau (ngày)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={newDiagRevisitDays}
                  onChange={(e) => setNewDiagRevisitDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-[#1a2b4b] focus:border-primary outline-hidden font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddingDiagnosis(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSavingDiag}
                onClick={handleSaveNewDiagnosis}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer active:scale-95 transition-all"
              >
                {isSavingDiag ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Lưu vào tiền sử</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL XEM ẢNH MINH CHỨNG VỈ THUỐC */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                <div>
                  <h4 className="font-black text-sm text-[#1a2b4b]">
                    Ảnh minh chứng: {viewingPhotoUrl.medName}
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Cữ {viewingPhotoUrl.timeStr} {viewingPhotoUrl.timingLabel ? `• ${viewingPhotoUrl.timingLabel}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPhotoUrl(null)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center min-h-[300px] max-h-[550px] overflow-hidden">
              <img 
                src={viewingPhotoUrl.url} 
                alt="Minh chứng vỉ thuốc" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="p-3.5 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewingPhotoUrl(null)}
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
