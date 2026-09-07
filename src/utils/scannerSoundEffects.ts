/**
 * HeyMedi Scanner Sound Effects
 * Sử dụng Web Audio API thuần túy để tạo hiệu ứng âm thanh quét radar công nghệ cao,
 * laser sweep, xung nhịp điện tử và chuông xác nhận hoàn tất thành công.
 * Không cần tải bất kỳ file MP3 nào từ bên ngoài, hoạt động mượt mà 100% offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx && typeof window !== "undefined") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Âm thanh quét Laser Radar bắt đầu (Tần số tăng dần từ 350Hz -> 1600Hz kèm hiệu ứng lọc bandpass)
 */
export function playScannerStartSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    // Tần số quét vút lên như radar laser công nghệ cao
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1700, ctx.currentTime + 0.35);

    // Âm lượng fade in rồi fade out mượt mà
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.debug("Scanner sound error:", err);
  }
}

/**
 * Âm thanh xung nhịp điện tử định vị dữ liệu (Cyber Scanner Blip)
 */
export function playScannerPulseSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(980, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch (err) {
    console.debug("Scanner pulse sound error:", err);
  }
}

/**
 * Âm thanh chuông công nghệ cao khi trích xuất OCR hoàn tất thành công
 * Hợp âm arpeggio 4 nốt (C5 - E5 - G5 - C6) trong trẻo, sang trọng
 */
export function playScannerSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Các nốt hợp âm: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.25 },
      { freq: 659.25, time: 0.08, dur: 0.25 },
      { freq: 783.99, time: 0.16, dur: 0.30 },
      { freq: 1046.50, time: 0.24, dur: 0.45 }
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.05);
    });
  } catch (err) {
    console.debug("Scanner success sound error:", err);
  }
}

/**
 * Âm cảnh báo y khoa khi phát hiện ảnh sai hoặc tài liệu không hợp lệ
 */
export function playScannerErrorSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    [0, 0.15].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime + offset);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.12);
    });
  } catch (err) {
    console.debug("Scanner error sound error:", err);
  }
}
