/**
 * Realtime Bridge: Đồng bộ tức thì (<1ms) giữa các tab cùng trình duyệt
 * và kết nối Supabase Realtime cho các thiết bị khác nhau.
 */

type RealtimeListener = (event: string, payload: any) => void;

class RealtimeBridge {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<RealtimeListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('heymedi_realtime_bus');
        this.channel.onmessage = (event) => {
          const { eventName, payload } = event.data || {};
          if (eventName) {
            this.listeners.forEach((listener) => {
              try {
                listener(eventName, payload);
              } catch (e) {
                console.error("Error in realtime listener:", e);
              }
            });
          }
        };
      } catch (e) {
        console.warn("Failed to initialize BroadcastChannel:", e);
      }
    }
  }

  // Phát tín hiệu ra các tab khác trên cùng trình duyệt
  public broadcast(eventName: string, payload: any) {
    if (this.channel) {
      try {
        this.channel.postMessage({ eventName, payload, timestamp: Date.now() });
      } catch (e) {
        console.warn("Broadcast channel postMessage error:", e);
      }
    }
  }

  // Lắng nghe sự kiện từ các tab khác
  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtimeBridge = new RealtimeBridge();
