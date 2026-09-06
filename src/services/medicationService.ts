import { supabase } from '../lib/supabase';

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  instructions: string;
  image_url: string;
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

/**
 * Fetch all reminders for a specific patient for today.
 */
export async function getTodaySchedule(patientId: string): Promise<Reminder[]> {
  if (!patientId) return [];
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
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
      console.error('Error fetching today schedule:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    // Handle Supabase joining giving an array or object for medication
    return data.map(r => ({
      ...r,
      medication: Array.isArray(r.medication) ? r.medication[0] : r.medication
    })) as Reminder[];
  } catch (err) {
    console.error('getTodaySchedule unexpected error:', err);
    return [];
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
 * Add a medication and its reminder for a patient.
 */
export async function addMedicationAndReminder(
  patientId: string,
  name: string,
  dosage: string,
  instructions: string,
  timeOfDay: string,
  imageUrl?: string | null
): Promise<void> {
  if (!patientId) throw new Error("patientId is required");

  // 1. Insert Medication
  const { data: medData, error: medError } = await supabase
    .from('medications')
    .insert({
      patient_id: patientId,
      name,
      dosage,
      instructions,
      image_url: imageUrl || null
    })
    .select()
    .single();

  if (medError) {
    console.error("Error inserting medication:", medError);
    throw medError;
  }

  // 2. Insert Reminder
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  const { error: reminderError } = await supabase
    .from('reminders')
    .insert({
      medication_id: medData.id,
      patient_id: patientId,
      scheduled_time: scheduledTime.toISOString(),
      status: 'pending'
    });

  if (reminderError) {
    console.error("Error inserting reminder:", reminderError);
    throw reminderError;
  }
}
