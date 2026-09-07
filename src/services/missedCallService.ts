export interface MissedCall {
  id: string;
  callerName: string;
  callerRole?: string;
  callerPhone?: string;
  callerAvatar?: string;
  timestamp: string;
  formattedTime: string;
  formattedDate: string;
  isSOS?: boolean;
  isRead: boolean;
}

const STORAGE_KEY = 'heymedi_missed_calls';

export function getMissedCalls(): MissedCall[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse missed calls:", e);
    return [];
  }
}

export function recordMissedCall(call: {
  callerName: string;
  callerRole?: string;
  callerPhone?: string;
  callerAvatar?: string;
  isSOS?: boolean;
}): MissedCall {
  try {
    const list = getMissedCalls();
    const now = new Date();
    const newRecord: MissedCall = {
      id: `mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      callerName: call.callerName || "Người thân",
      callerRole: call.callerRole || "Gia đình",
      callerPhone: call.callerPhone || "0901 234 567",
      callerAvatar: call.callerAvatar,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      formattedDate: `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
      isSOS: call.isSOS || false,
      isRead: false
    };

    const updated = [newRecord, ...list].slice(0, 20); // Keep latest 20
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch local event for instant reactive update across tabs/components
    window.dispatchEvent(new CustomEvent('heymedi_missed_calls_changed', { detail: newRecord }));

    return newRecord;
  } catch (e) {
    console.error("Failed to record missed call:", e);
    return {} as any;
  }
}

export function markMissedCallsAsRead(): void {
  try {
    const list = getMissedCalls();
    const updated = list.map(c => ({ ...c, isRead: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('heymedi_missed_calls_changed'));
  } catch (e) {
    console.error("Failed to mark missed calls read:", e);
  }
}

export function getUnreadMissedCallCount(): number {
  return getMissedCalls().filter(c => !c.isRead).length;
}

export function clearMissedCalls(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('heymedi_missed_calls_changed'));
}
