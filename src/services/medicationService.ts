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
    throw error;
  }

  // Handle Supabase joining giving an array or object for medication
  return (data as any[]).map(r => ({
    ...r,
    medication: Array.isArray(r.medication) ? r.medication[0] : r.medication
  })) as Reminder[];
}

/**
 * Mark a reminder as taken.
 */
export async function markAsTaken(reminderId: string): Promise<void> {
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
}

/**
 * Get overdue reminders (more than 30 mins late and still pending).
 */
export async function getOverdueReminders(patientId: string): Promise<Reminder[]> {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
  
  // We only want reminders from today that are overdue
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
    .lt('scheduled_time', thirtyMinsAgo.toISOString())
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching overdue reminders:', error);
    throw error;
  }

  return (data as any[]).map(r => ({
    ...r,
    medication: Array.isArray(r.medication) ? r.medication[0] : r.medication
  })) as Reminder[];
}
