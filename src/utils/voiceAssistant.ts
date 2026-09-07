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

export interface SpeakOptions {
  voiceId?: 'female_north' | 'male_north' | 'female_south' | 'male_south';
  speed?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
}

export const getSavedVoiceSettings = (): Required<Omit<SpeakOptions, 'onEnd'>> => {
  try {
    const saved = localStorage.getItem('heymedi_voice_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        voiceId: parsed.voiceId || 'female_north',
        speed: parsed.speed || 0.85,
        pitch: parsed.pitch || 1.12,
        volume: parsed.volume || 90
      };
    }
  } catch {}
  return {
    voiceId: 'female_north',
    speed: 0.85,
    pitch: 1.12,
    volume: 90
  };
};

let currentAudio: HTMLAudioElement | null = null;
let currentOnEndCallback: (() => void) | null = null;
let speakingFlag = false;

export const isSpeaking = (): boolean => {
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
    return true;
  }
  if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    return true;
  }
  return speakingFlag;
};

export const stopSpeech = () => {
  speakingFlag = false;
  const cb = currentOnEndCallback;
  currentOnEndCallback = null;

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  if (cb) {
    try {
      cb();
    } catch {}
  }
};

export const speakVietnamese = (text: string, options?: SpeakOptions) => {
  stopSpeech();

  const saved = getSavedVoiceSettings();
  const voiceId = options?.voiceId || saved.voiceId;
  const speed = options?.speed ?? saved.speed;
  const volume = Math.max(0.1, Math.min(1.0, (options?.volume ?? saved.volume) / 100));
  currentOnEndCallback = options?.onEnd || null;

  const cleanText = text.trim();
  if (!cleanText) return;

  speakingFlag = true;

  // Cấu hình âm sắc và tốc độ riêng biệt cho từng giọng đọc
  let playbackRate = speed;
  let preservesPitch = true;

  if (voiceId === 'male_north') {
    // Giọng Nam Miền Bắc: Trầm ấm, dải tần thấp (hạ ~3.5 semitones)
    playbackRate = Math.max(0.72, speed * 0.84);
    preservesPitch = false;
  } else if (voiceId === 'male_south') {
    // Giọng Nam Miền Nam: Thân thiện, hào sảng (hạ ~2.5 semitones)
    playbackRate = Math.max(0.76, speed * 0.88);
    preservesPitch = false;
  } else if (voiceId === 'female_south') {
    // Giọng Nữ Miền Nam: Trong trẻo, tươi vui, cao hơn 1 tone
    playbackRate = Math.min(1.2, speed * 1.06);
    preservesPitch = false;
  } else {
    // Giọng Nữ Miền Bắc: Dịu dàng, chuẩn mực
    playbackRate = speed;
    preservesPitch = true;
  }

  const handleFinish = () => {
    speakingFlag = false;
    currentAudio = null;
    const cb = currentOnEndCallback;
    currentOnEndCallback = null;
    if (cb) {
      try {
        cb();
      } catch {}
    }
  };

  // Phương thức 1: Online Google Vietnamese TTS Audio Engine kết hợp Browser Pitch Shifter
  // Tạo ra sự khác biệt âm thanh RÕ RỆT giữa Nam / Nữ và vùng miền
  if (cleanText.length < 200) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(url);
      currentAudio = audio;
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      
      // Tắt preservesPitch để thay đổi cao độ vật lý của âm thanh
      (audio as any).preservesPitch = preservesPitch;
      (audio as any).mozPreservesPitch = preservesPitch;
      (audio as any).webkitPreservesPitch = preservesPitch;

      audio.onended = handleFinish;
      audio.onerror = () => {
        fallbackToSpeechSynthesis(cleanText, voiceId, speed, volume, handleFinish);
      };

      let hasStarted = false;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            hasStarted = true;
          })
          .catch(() => {
            if (!hasStarted) {
              fallbackToSpeechSynthesis(cleanText, voiceId, speed, volume, handleFinish);
            }
          });
        return;
      }
    } catch (e) {
      console.warn("DualEngine Audio playback failed, using Web Speech API fallback:", e);
    }
  }

  // Phương thức 2: Fallback Web Speech Synthesis
  fallbackToSpeechSynthesis(cleanText, voiceId, speed, volume, handleFinish);
};

function fallbackToSpeechSynthesis(text: string, voiceId: string, speed: number, volume: number, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    console.warn("Trình duyệt không hỗ trợ Web Speech API.");
    speakingFlag = false;
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
  } catch {}

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.volume = volume;

  utterance.onend = () => {
    speakingFlag = false;
    onEnd?.();
  };
  utterance.onerror = () => {
    speakingFlag = false;
    onEnd?.();
  };

  if (voiceId === 'male_north') {
    utterance.pitch = 0.75;
    utterance.rate = speed * 0.88;
  } else if (voiceId === 'male_south') {
    utterance.pitch = 0.82;
    utterance.rate = speed * 0.92;
  } else if (voiceId === 'female_south') {
    utterance.pitch = 1.08;
    utterance.rate = speed * 1.04;
  } else {
    utterance.pitch = 1.18;
    utterance.rate = speed;
  }

  const voices = window.speechSynthesis.getVoices();
  const viVoices = voices.filter(v => v.lang.includes('vi') || v.lang.includes('VN'));

  if (viVoices.length > 0) {
    if (voiceId.startsWith('male')) {
      const maleVoice = viVoices.find(v => 
        v.name.toLowerCase().includes('an') ||
        v.name.toLowerCase().includes('nam') || 
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('minh')
      );
      utterance.voice = maleVoice || viVoices[0];
    } else {
      const femaleVoice = viVoices.find(v => 
        v.name.toLowerCase().includes('my') || 
        v.name.toLowerCase().includes('hoai') ||
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('linh')
      );
      utterance.voice = femaleVoice || viVoices[0];
    }
  }

  window.speechSynthesis.speak(utterance);
}

export const announceMedication = (medName: string, dosage: string, options?: SpeakOptions) => {
  playAlarmTone();
  const cleanName = medName.split('(')[0].trim() || medName;
  setTimeout(() => {
    speakVietnamese(`Đã đến giờ uống thuốc ${cleanName}, liều lượng ${dosage}. Bác nhớ uống thuốc nhé!`, options);
  }, 800); // Speak after beep
};

export const announceDoseSession = (sessionTime: string, count: number, medNames: string[], options?: SpeakOptions) => {
  playAlarmTone();
  const cleanList = medNames.map(n => n.split('(')[0].trim()).filter(Boolean);
  const text = `Đã đến cữ thuốc lúc ${sessionTime}. Cữ này gồm ${count} loại thuốc: ${cleanList.join(", ")}. Bác kiểm tra đủ thuốc rồi uống nhé!`;
  setTimeout(() => {
    speakVietnamese(text, options);
  }, 800);
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
  hour?: number;
  minute?: number;
  solarDate: string;
  lunarDate: string;
  schedule: Array<{ status: string; scheduled_time: string; medication?: { name: string } }>;
}) => {
  const hour = params.hour ?? new Date().getHours();
  const minute = params.minute ?? new Date().getMinutes();
  const { patientName, solarDate, lunarDate, schedule } = params;

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

