export const playAlarmTone = () => {
  // Try to play a simple beep using Web Audio API as a fallback if no mp3 is available
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    
    // Quick double beep
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.3);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    console.error("Audio playback failed:", e);
  }
};

export const speakVietnamese = (text: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Trình duyệt không hỗ trợ Web Speech API.");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.9; // Slightly slower for elderly
  utterance.pitch = 1.0;

  // Try to find a Vietnamese voice if available
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
  if (viVoice) {
    utterance.voice = viVoice;
  }

  window.speechSynthesis.speak(utterance);
};

export const announceMedication = (medName: string, dosage: string) => {
  playAlarmTone();
  setTimeout(() => {
    speakVietnamese(`Đã đến giờ uống thuốc ${medName}, liều lượng ${dosage}. Ông bà uống thuốc sau ăn nhé!`);
  }, 800); // Speak after beep
};

export const unlockAudio = () => {
  // Call this on user interaction to unlock audio contexts
  playAlarmTone();
  speakVietnamese("Hệ thống nhắc nhở đã được kích hoạt.");
};

export const silentAudioUnlock = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);

    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    console.log("Silent AudioContext unlocked successfully");
  } catch (e) {
    console.warn("Silent audio unlock failed:", e);
  }
};

/**
 * Còi hú cấp cứu SOS cho Caregiver (đã điều chỉnh âm lượng vừa phải, êm tai)
 * Trả về hàm stop() để dừng còi hú
 */
export const startSirenAlarm = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Sóng sine êm dịu, âm lượng giảm xuống 0.08 vừa tai không gây chói tai
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

    const now = audioCtx.currentTime;
    // Dao động tần số êm ái giữa 520Hz và 850Hz
    for (let i = 0; i < 75; i++) {
      oscillator.frequency.setValueAtTime(520, now + i * 1.0);
      oscillator.frequency.exponentialRampToValueAtTime(850, now + i * 1.0 + 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(520, now + i * 1.0 + 1.0);
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();

    return () => {
      try {
        oscillator.stop();
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (err) {}
    };
  } catch (e) {
    console.error("Failed to start siren alarm:", e);
    return () => {};
  }
};

/**
 * Chuông reo cuộc gọi đến (Ringtone điện thoại du dương)
 * Trả về hàm stop() để dừng chuông
 */
export const startRingtone = () => {
  let isPlaying = true;
  let intervalId: any;

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const playChime = () => {
      if (!isPlaying) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

        // Chime double tone
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3); // A5

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
      } catch (e) {}
    };

    playChime();
    intervalId = setInterval(playChime, 2500);

    return () => {
      isPlaying = false;
      if (intervalId) clearInterval(intervalId);
    };
  } catch (e) {
    console.warn("Ringtone failed:", e);
    return () => {
      isPlaying = false;
      if (intervalId) clearInterval(intervalId);
    };
  }
};

/**
 * Phát thanh tổng quan lịch trình buổi sáng / ngày cho người cao tuổi
 */
export const announceDailyBriefing = (params: {
  patientName: string;
  hour: number;
  minute: number;
  solarDate: string;
  lunarDate: string;
  schedule: Array<{ status: string; scheduled_time: string; medication?: { name: string } }>;
}) => {
  const { patientName, hour, minute, solarDate, lunarDate, schedule } = params;

  let greeting = "Chào buổi sáng";
  if (hour >= 11 && hour < 14) greeting = "Chào buổi trưa";
  else if (hour >= 14 && hour < 18) greeting = "Chào buổi chiều";
  else if (hour >= 18 || hour < 5) greeting = "Chào buổi tối";

  const total = schedule.length;
  const taken = schedule.filter(r => r.status === 'taken').length;
  const pending = schedule.filter(r => r.status === 'pending');

  let medText = "";
  if (total === 0) {
    medText = "Hôm nay Bác chưa có lịch uống thuốc nào được cài đặt.";
  } else if (pending.length === 0) {
    medText = `Bác đã uống đủ toàn bộ ${total} cữ thuốc hôm nay rồi ạ. Rất đáng khen ngợi!`;
  } else {
    const nextMed = pending[0];
    const nextHour = new Date(nextMed.scheduled_time).getHours();
    const nextMin = new Date(nextMed.scheduled_time).getMinutes();
    const nextName = nextMed.medication?.name || "thuốc";
    medText = `Hôm nay Bác có tổng cộng ${total} cữ thuốc. Bác đã uống ${taken} cữ, còn ${pending.length} cữ chưa uống. Cữ tiếp theo lúc ${nextHour} giờ ${nextMin > 0 ? nextMin + ' phút' : ''} là thuốc ${nextName}.`;
  }

  const fullText = `${greeting} Bác ${patientName}! Bây giờ là ${hour} giờ ${minute} phút, ${solarDate}, tức ${lunarDate}. ${medText} Chúc Bác một ngày thật nhiều niềm vui và dồi dào sức khỏe!`;

  playAlarmTone();
  setTimeout(() => {
    speakVietnamese(fullText);
  }, 500);
};

