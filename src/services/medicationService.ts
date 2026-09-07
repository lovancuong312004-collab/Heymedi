import { supabase } from '../lib/supabase';

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  instructions: string;
  image_url: string;
  created_at?: string;
}

export interface Reminder {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'missed';
  taken_at: string | null;
  medication?: Medication;
}

export interface AddMedicationCourseParams {
  patientId: string;
  name: string;
  dosage: string;
  instructions: string;
  dailyTimes: string[]; // e.g. ["08:00", "20:00"]
  startDate?: string; // YYYY-MM-DD
  durationDays?: number; // e.g. 7, 14, 30
  imageUrl?: string | null;
}

/**
 * Fetch all reminders for a specific patient for a specific date (00:00:00 - 23:59:59).
 */
export async function getScheduleByDate(patientId: string, targetDate: Date | string = new Date()): Promise<Reminder[]> {
  if (!patientId) return [];
  try {
    const d = typeof targetDate === 'string' ? new Date(targetDate) : new Date(targetDate.getTime());
    const startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        medication:medications (*)
      `)
      .eq('patient_id', patientId)
      .gte('scheduled_time', startOfDay.toISOString())
      .lte('scheduled_time', endOfDay.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedule by date:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map(r => ({
      ...r,
      medication: Array.isArray(r.medication) ? r.medication[0] : r.medication
    })) as Reminder[];
  } catch (err) {
    console.error('getScheduleByDate unexpected error:', err);
    return [];
  }
}

/**
 * Fetch all reminders for a specific patient for today.
 */
export async function getTodaySchedule(patientId: string): Promise<Reminder[]> {
  return getScheduleByDate(patientId, new Date());
}

/**
 * Fetch days within a date range that have scheduled reminders.
 * Returns a map of 'YYYY-MM-DD' => { count: number, allTaken: boolean, hasPending: boolean }
 */
export async function getScheduleDaysSummary(
  patientId: string, 
  startDate: Date, 
  endDate: Date
): Promise<Record<string, { count: number; allTaken: boolean; hasPending: boolean }>> {
  if (!patientId) return {};
  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('reminders')
      .select('id, scheduled_time, status')
      .eq('patient_id', patientId)
      .gte('scheduled_time', start.toISOString())
      .lte('scheduled_time', end.toISOString());

    if (error || !data) return {};

    const summary: Record<string, { count: number; allTaken: boolean; hasPending: boolean }> = {};
    for (const r of data) {
      const dateKey = new Date(r.scheduled_time).toISOString().split('T')[0];
      if (!summary[dateKey]) {
        summary[dateKey] = { count: 0, allTaken: true, hasPending: false };
      }
      summary[dateKey].count += 1;
      if (r.status !== 'taken') {
        summary[dateKey].allTaken = false;
        summary[dateKey].hasPending = true;
      }
    }
    return summary;
  } catch (err) {
    console.error('getScheduleDaysSummary error:', err);
    return {};
  }
}

/**
 * Mark a reminder as taken.
 */
export async function markAsTaken(reminderId: string): Promise<void> {
  if (!reminderId) return;
  try {
    const { error } = await supabase
      .from('reminders')
      .update({ 
        status: 'taken',
        taken_at: new Date().toISOString()
      })
      .eq('id', reminderId);

    if (error) {
      console.error('Error marking reminder as taken:', error);
      throw error;
    }
  } catch (err) {
    console.error('markAsTaken unexpected error:', err);
    throw err;
  }
}

/**
 * Get overdue reminders (more than 30 mins late and still pending).
 */
export async function getOverdueReminders(patientId: string): Promise<Reminder[]> {
  if (!patientId) return [];
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        medication:medications (*)
      `)
      .eq('patient_id', patientId)
      .eq('status', 'pending')
      .gte('scheduled_time', startOfDay.toISOString())
      .lte('scheduled_time', thirtyMinsAgo.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching overdue reminders:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map(r => ({
      ...r,
      medication: Array.isArray(r.medication) ? r.medication[0] : r.medication
    })) as Reminder[];
  } catch (err) {
    console.error('getOverdueReminders unexpected error:', err);
    return [];
  }
}

/**
 * Add a medication with a complete treatment course (lộ trình điều trị theo liều và ngày).
 * Generates reminder records for every day in the treatment course across all daily times.
 */
export async function addMedicationWithCourse({
  patientId,
  name,
  dosage,
  instructions,
  dailyTimes,
  startDate,
  durationDays = 7,
  imageUrl
}: AddMedicationCourseParams): Promise<void> {
  if (!patientId) throw new Error("patientId is required");
  if (!name.trim()) throw new Error("Tên thuốc không được để trống");
  if (!dailyTimes || dailyTimes.length === 0) {
    dailyTimes = ["08:00"];
  }

  // 1. Tính toán ngày bắt đầu & ngày kết thúc
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + (Math.max(1, durationDays) - 1));

  const formatDateVN = (d: Date) => 
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  const courseNote = `Lộ trình: ${durationDays} ngày (${formatDateVN(start)} - ${formatDateVN(end)})`;
  const fullInstructions = instructions 
    ? (instructions.includes("Lộ trình") ? instructions : `${instructions} | ${courseNote}`)
    : courseNote;

  // 2. Lưu thông tin thuốc vào bảng medications
  const { data: medData, error: medError } = await supabase
    .from('medications')
    .insert({
      patient_id: patientId,
      name: name.trim(),
      dosage: dosage || "1 viên",
      instructions: fullInstructions,
      image_url: imageUrl || null
    })
    .select()
    .single();

  if (medError) {
    console.error("Error inserting medication:", medError);
    throw medError;
  }

  // 3. Tạo danh sách tất cả các cữ nhắc thuốc cho toàn bộ lộ trình
  const remindersToInsert: any[] = [];

  for (let dayOffset = 0; dayOffset < durationDays; dayOffset++) {
    const currentDay = new Date(start);
    currentDay.setDate(currentDay.getDate() + dayOffset);

    for (const timeStr of dailyTimes) {
      const [h, m] = timeStr.split(':').map(Number);
      const schedDate = new Date(currentDay);
      schedDate.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);

      remindersToInsert.push({
        medication_id: medData.id,
        patient_id: patientId,
        scheduled_time: schedDate.toISOString(),
        status: 'pending'
      });
    }
  }

  // 4. Batch insert toàn bộ reminders vào database
  if (remindersToInsert.length > 0) {
    const { error: batchError } = await supabase
      .from('reminders')
      .insert(remindersToInsert);

    if (batchError) {
      console.error("Error batch inserting reminders:", batchError);
      throw batchError;
    }
  }
}

/**
 * Backward-compatible single-time medication add.
 */
export async function addMedicationAndReminder(
  patientId: string,
  name: string,
  dosage: string,
  instructions: string,
  timeOfDay: string,
  imageUrl?: string | null,
  durationDays: number = 7
): Promise<void> {
  return addMedicationWithCourse({
    patientId,
    name,
    dosage,
    instructions,
    dailyTimes: [timeOfDay || "08:00"],
    durationDays,
    imageUrl
  });
}

/**
 * Xóa thuốc và toàn bộ lịch nhắc chưa uống
 */
export async function deleteMedication(medicationId: string): Promise<void> {
  if (!medicationId) return;
  try {
    await supabase
      .from('reminders')
      .delete()
      .eq('medication_id', medicationId);

    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', medicationId);

    if (error) {
      console.error("Error deleting medication:", error);
      throw error;
    }
  } catch (err) {
    console.error("deleteMedication error:", err);
    throw err;
  }
}
