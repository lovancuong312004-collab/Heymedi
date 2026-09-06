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
