export type Language = 'vi' | 'en';

export interface Translations {
  [key: string]: {
    vi: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation Tabs (Người già)
  "nav.home": { vi: "Trang chủ", en: "Home" },
  "nav.meds": { vi: "Thuốc của tôi", en: "My Meds" },
  "nav.family": { vi: "Gia đình", en: "Family" },
  "nav.settings": { vi: "Cài đặt", en: "Settings" },

  // Navigation Tabs (Người chăm sóc)
  "nav.caregiver_home": { vi: "Trang chủ", en: "Dashboard" },
  "nav.caregiver_meds": { vi: "Lịch thuốc", en: "Schedule" },
  "nav.caregiver_family": { vi: "Gia đình", en: "Family" },
  "nav.caregiver_notifications": { vi: "Thông báo", en: "Alerts" },
  "nav.caregiver_reports": { vi: "Báo cáo", en: "Reports" },
  "nav.caregiver_settings": { vi: "Cài đặt", en: "Settings" },

  // Settings Screen Common
  "settings.title": { vi: "Cài đặt", en: "Settings" },
  "settings.caregiver_title": { vi: "Cài đặt người chăm sóc", en: "Caregiver Settings" },
  "settings.profile": { vi: "Hồ sơ sức khỏe & Bệnh nền", en: "Health Profile & Conditions" },
  "settings.profile_sub": { vi: "Xem & Sửa", en: "View & Edit" },
  "settings.sound_voice": { vi: "Âm thanh & Giọng nói", en: "Sound & Voice Assistant" },
  "settings.sound_voice_ai": { vi: "Âm thanh & Giọng nói AI", en: "Sound & AI Voice" },
  "settings.font_size": { vi: "Cỡ chữ hiển thị", en: "Display Font Size" },
  "settings.language": { vi: "Ngôn ngữ", en: "Language" },
  "settings.cloud_sync": { vi: "Đồng bộ đám mây", en: "Cloud Sync" },
  "settings.guide": { vi: "Hướng dẫn sử dụng", en: "User Guide" },
  "settings.about": { vi: "Giới thiệu & Hỗ trợ kỹ thuật", en: "About & Tech Support" },
  "settings.logout": { vi: "Đăng xuất", en: "Log Out" },
  "settings.version": { vi: "Phiên bản", en: "Version" },

  // Voice Settings Modal
  "voice.modal_title": { vi: "Cài đặt Âm thanh & Giọng nói AI", en: "Sound & AI Voice Settings" },
  "voice.choose_voice": { vi: "Chọn giọng đọc trợ lý:", en: "Select Assistant Voice:" },
  "voice.female_north": { vi: "Giọng Nữ (Miền Bắc)", en: "Female Voice (Northern)" },
  "voice.female_north_desc": { vi: "Dịu dàng, chuẩn phát thanh viên, êm dịu", en: "Gentle, clear newscaster tone" },
  "voice.male_north": { vi: "Giọng Nam (Miền Bắc)", en: "Male Voice (Northern)" },
  "voice.male_north_desc": { vi: "Trầm ấm, dõng dạc, nghe rõ từng từ", en: "Deep, warm, and authoritative" },
  "voice.female_south": { vi: "Giọng Nữ (Miền Nam)", en: "Female Voice (Southern)" },
  "voice.female_south_desc": { vi: "Truyền cảm, ân cần, ngọt ngào", en: "Warm, caring, and melodious" },
  "voice.male_south": { vi: "Giọng Nam (Miền Nam)", en: "Male Voice (Southern)" },
  "voice.male_south_desc": { vi: "Thân thiện, mộc mạc, gần gũi", en: "Friendly, casual, and clear" },
  "voice.speed": { vi: "Tốc độ đọc:", en: "Reading Speed:" },
  "voice.speed_slow": { vi: "Chậm rãi (Dễ nghe cho người già)", en: "Slow (Easy for elderly)" },
  "voice.speed_normal": { vi: "Vừa phải (Tự nhiên)", en: "Moderate (Natural)" },
  "voice.speed_fast": { vi: "Nhanh gọn", en: "Fast" },
  "voice.volume": { vi: "Âm lượng loa chuông:", en: "Speaker / Alarm Volume:" },
  "voice.test_button": { vi: "Thử nghe giọng đọc AI ngay", en: "Test AI Voice Now" },
  "voice.testing": { vi: "Đang phát âm giọng đọc...", en: "Playing voice sample..." },

  // Font Size Settings Modal
  "font.modal_title": { vi: "Cỡ chữ hiển thị ứng dụng", en: "Application Font Size" },
  "font.normal": { vi: "Tiêu chuẩn (16px)", en: "Standard (16px)" },
  "font.normal_desc": { vi: "Gọn gàng, kích thước mặc định", en: "Compact, default size" },
  "font.large": { vi: "Chữ To (18px) - Khuyên dùng", en: "Large (18px) - Recommended" },
  "font.large_desc": { vi: "Chữ to rõ ràng, rất phù hợp cho người lớn tuổi", en: "Big & clear, ideal for seniors" },
  "font.xl": { vi: "Rất To (20px)", en: "Extra Large (20px)" },
  "font.xl_desc": { vi: "Chữ siêu to, tối ưu cho người mắt kém", en: "Huge text, optimized for low vision" },
  "font.preview_title": { vi: "Xem trước độ to của chữ:", en: "Live Preview:" },
  "font.preview_text": { 
    vi: "Uống thuốc Amlodipine 5mg: 1 viên sau ăn sáng lúc 08:00 để duy trì huyết áp ổn định.", 
    en: "Take Amlodipine 5mg: 1 tablet after breakfast at 08:00 to keep blood pressure stable." 
  },

  // Language Settings Modal
  "lang.modal_title": { vi: "Chọn ngôn ngữ hiển thị", en: "Select Display Language" },
  "lang.vi": { vi: "Tiếng Việt (Mặc định)", en: "Tiếng Việt (Vietnamese)" },
  "lang.en": { vi: "English (Tiếng Anh)", en: "English" },

  // Cloud Sync
  "sync.modal_title": { vi: "Đồng bộ & Lưu trữ đám mây", en: "Cloud Synchronization" },
  "sync.status": { vi: "Dữ liệu được kết nối thời gian thực:", en: "Data synced in real time:" },
  "sync.desc": { 
    vi: "Mọi thay đổi về lịch uống thuốc, minh chứng ảnh và hồ sơ sức khỏe đều tự động đồng bộ ngay lập tức giữa hai máy.", 
    en: "All changes to schedules, photo proofs, and health profiles sync instantly between both devices." 
  },
  "sync.last_time": { vi: "Lần đồng bộ gần nhất:", en: "Last sync time:" },
  "sync.button": { vi: "Đồng bộ dữ liệu ngay", en: "Sync Data Now" },
  "sync.syncing": { vi: "Đang đồng bộ...", en: "Syncing..." },
  "sync.success": { vi: "Đồng bộ dữ liệu thành công!", en: "Sync successful!" },

  // Logout
  "logout.confirm_title": { vi: "Xác nhận đăng xuất", en: "Confirm Logout" },
  "logout.confirm_msg": { vi: "Bác có chắc chắn muốn đăng xuất khỏi tài khoản không?", en: "Are you sure you want to log out?" },
  "logout.cancel": { vi: "Hủy", en: "Cancel" },
  "logout.confirm": { vi: "Đăng xuất ngay", en: "Log Out" }
};
