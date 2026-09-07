import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language } from '../utils/translations';
import { speakVietnamese, playAlarmTone } from '../utils/voiceAssistant';

export type FontSize = 'normal' | 'large' | 'xl';
export type VoiceId = 'female_north' | 'male_north' | 'female_south' | 'male_south';

export interface VoiceSettings {
  voiceId: VoiceId;
  speed: number;   // 0.8 (Chậm), 0.9 (Vừa), 1.0 (Nhanh)
  volume: number;  // 20 - 100 (%)
  pitch: number;   // 0.85 - 1.15
}

interface SettingsContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  t: (key: string, fallback?: string) => string;
  testVoice: (patientName?: string) => void;
}

const defaultVoiceSettings: VoiceSettings = {
  voiceId: 'female_north',
  speed: 0.85,
  volume: 90,
  pitch: 1.12
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // 1. Cỡ chữ hiển thị
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('heymedi_font_size') as FontSize) || 'large';
  });

  // 2. Ngôn ngữ hiển thị
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('heymedi_language') as Language) || 'vi';
  });

  // 3. Giọng nói AI
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('heymedi_voice_settings');
      if (saved) return { ...defaultVoiceSettings, ...JSON.parse(saved) };
    } catch {}
    return defaultVoiceSettings;
  });

  // Cập nhật DOM data-font-size khi cỡ chữ thay đổi
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem('heymedi_font_size', fontSize);
  }, [fontSize]);

  // Cập nhật ngôn ngữ
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('heymedi_language', lang);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem('heymedi_font_size', size);
  };

  const setVoiceSettings = (partial: Partial<VoiceSettings>) => {
    setVoiceSettingsState(prev => {
      const updated = { ...prev, ...partial };
      // Tự động điều chỉnh pitch theo giọng đọc nếu đổi voiceId
      if (partial.voiceId) {
        if (partial.voiceId === 'male_north') updated.pitch = 0.85;
        else if (partial.voiceId === 'female_north') updated.pitch = 1.12;
        else if (partial.voiceId === 'male_south') updated.pitch = 0.90;
        else if (partial.voiceId === 'female_south') updated.pitch = 1.06;
      }
      localStorage.setItem('heymedi_voice_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Hàm dịch chuỗi
  const t = (key: string, fallback?: string): string => {
    const entry = translations[key];
    if (entry) {
      return entry[language] || fallback || key;
    }
    return fallback || key;
  };

  // Nghe thử giọng nói trực tiếp
  const testVoice = (name: string = "Bác") => {
    playAlarmTone();
    setTimeout(() => {
      const voiceNames: Record<VoiceId, string> = {
        female_north: "Giọng Nữ Miền Bắc dịu dàng",
        male_north: "Giọng Nam Miền Bắc trầm ấm",
        female_south: "Giọng Nữ Miền Nam truyền cảm",
        male_south: "Giọng Nam Miền Nam thân thiện"
      };

      const voiceDesc = voiceNames[voiceSettings.voiceId] || "Giọng đọc Heymedi";
      const sampleGreeting = language === 'en'
        ? `Hello! This is Heymedi AI Assistant speaking with your selected voice. Reading speed is ${Math.round(voiceSettings.speed * 100)} percent.`
        : `Xin chào ${name}! Đây là ${voiceDesc}. Âm lượng và tốc độ đọc hiện tại của Bác nghe đã rõ ràng và vừa tai chưa ạ?`;

      speakVietnamese(sampleGreeting, {
        voiceId: voiceSettings.voiceId,
        speed: voiceSettings.speed,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume
      });
    }, 450);
  };

  return (
    <SettingsContext.Provider
      value={{
        fontSize,
        setFontSize,
        language,
        setLanguage,
        voiceSettings,
        setVoiceSettings,
        t,
        testVoice
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
