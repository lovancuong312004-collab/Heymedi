import { supabase } from '../lib/supabase';

export interface FamilyCaregiverMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  isMe?: boolean;
}

const DEFAULT_MEMBERS: FamilyCaregiverMember[] = [
  {
    id: 'sample_doc_1',
    name: 'BS. Nguyễn Văn Hoàng',
    role: 'Bác sĩ gia đình',
    phone: '0988 123 456'
  },
  {
    id: 'sample_daughter_1',
    name: 'Chị Mai Linh',
    role: 'Con gái (Nhắc cữ trưa)',
    phone: '0912 888 999'
  }
];

export function getCustomCaregivers(patientId: string): FamilyCaregiverMember[] {
  if (!patientId) return DEFAULT_MEMBERS;
  try {
    const key = `heymedi_family_caregivers_${patientId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_MEMBERS));
      return DEFAULT_MEMBERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MEMBERS;
  }
}

export function addCustomCaregiver(
  patientId: string, 
  member: { name: string; role: string; phone: string; email?: string; avatar_url?: string }
): FamilyCaregiverMember {
  const current = getCustomCaregivers(patientId);
  const newMember: FamilyCaregiverMember = {
    ...member,
    id: `caregiver_${Date.now()}_${Math.random().toString(36).substring(7)}`
  };
  const updated = [newMember, ...current];
  try {
    localStorage.setItem(`heymedi_family_caregivers_${patientId}`, JSON.stringify(updated));
    const channel = supabase.channel('family-team-broadcast');
    channel.send({
      type: 'broadcast',
      event: 'FAMILY_TEAM_CHANGED',
      payload: { patientId }
    }).catch(() => {});
  } catch (e) {
    console.error(e);
  }
  return newMember;
}

export function deleteCustomCaregiver(patientId: string, memberId: string): void {
  const current = getCustomCaregivers(patientId);
  const updated = current.filter(m => m.id !== memberId);
  try {
    localStorage.setItem(`heymedi_family_caregivers_${patientId}`, JSON.stringify(updated));
    const channel = supabase.channel('family-team-broadcast');
    channel.send({
      type: 'broadcast',
      event: 'FAMILY_TEAM_CHANGED',
      payload: { patientId }
    }).catch(() => {});
  } catch (e) {
    console.error(e);
  }
}
