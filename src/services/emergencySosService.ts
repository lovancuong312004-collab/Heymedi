export interface SavedSosAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  lat?: number | null;
  lng?: number | null;
  google_maps_url?: string | null;
  timestamp: string;
  formattedTime: string;
  formattedDate: string;
  isRead: boolean;
  status: 'active' | 'resolved';
}

const STORAGE_KEY = 'heymedi_sos_alerts';

// Kênh BroadcastChannel đồng bộ tức thì đa tab trên cùng thiết bị
let crossTabChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    crossTabChannel = new BroadcastChannel('heymedi_emergency_bridge');
  }
} catch (e) {
  console.warn("BroadcastChannel not supported in this environment:", e);
}

export function getSosAlerts(): SavedSosAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: SavedSosAlert[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("Failed to parse SOS alerts from storage:", e);
    return [];
  }
}

export function recordSosAlert(payload: {
  patient_id?: string;
  patient_name?: string;
  lat?: number | null;
  lng?: number | null;
  google_maps_url?: string | null;
  timestamp?: string;
}): SavedSosAlert {
  try {
    const list = getSosAlerts();
    const alertTime = payload.timestamp ? new Date(payload.timestamp) : new Date();

    const newAlert: SavedSosAlert = {
      id: `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patient_id: payload.patient_id || 'patient_unknown',
      patient_name: payload.patient_name || 'Người thân',
      lat: payload.lat,
      lng: payload.lng,
      google_maps_url: payload.google_maps_url || (payload.lat && payload.lng ? `https://www.google.com/maps?q=${payload.lat},${payload.lng}` : null),
      timestamp: alertTime.toISOString(),
      formattedTime: alertTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      formattedDate: `${alertTime.getDate()}/${alertTime.getMonth() + 1}/${alertTime.getFullYear()}`,
      isRead: false,
      status: 'active'
    };

    // Giữ tối đa 30 cảnh báo khẩn cấp gần nhất
    const updated = [newAlert, ...list].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Bắn sự kiện nội bộ DOM
    window.dispatchEvent(new CustomEvent('heymedi_sos_alerts_changed', { detail: newAlert }));

    // Bắn qua BroadcastChannel đa tab
    if (crossTabChannel) {
      crossTabChannel.postMessage({ type: 'SOS_ALERT_RECORDED', alert: newAlert });
    }

    return newAlert;
  } catch (e) {
    console.error("Failed to record SOS alert:", e);
    return {} as any;
  }
}

export function markSosAlertAsRead(id: string) {
  try {
    const list = getSosAlerts();
    const updated = list.map(item => item.id === id ? { ...item, isRead: true } : item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('heymedi_sos_alerts_changed'));
  } catch (e) {
    console.error("Failed to mark SOS alert read:", e);
  }
}

export function resolveSosAlert(id: string) {
  try {
    const list = getSosAlerts();
    const updated = list.map(item => item.id === id ? { ...item, status: 'resolved' as const, isRead: true } : item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('heymedi_sos_alerts_changed'));
  } catch (e) {
    console.error("Failed to resolve SOS alert:", e);
  }
}

export function deleteSosAlert(id: string) {
  try {
    const list = getSosAlerts();
    const updated = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('heymedi_sos_alerts_changed'));
  } catch (e) {
    console.error("Failed to delete SOS alert:", e);
  }
}

export function clearAllSosAlerts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('heymedi_sos_alerts_changed'));
  } catch (e) {
    console.error("Failed to clear SOS alerts:", e);
  }
}
