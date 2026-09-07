-- =========================================================================
-- HEYMEDI - SCRIPT CẤU HÌNH DATABASE & STORAGE HOÀN CHỈNH TRÊN SUPABASE
-- Hướng dẫn: Mở Supabase Dashboard -> Vào mục "SQL Editor" -> Dán toàn bộ mã này vào -> Bấm nút "RUN"
-- =========================================================================

-- 1. BẬT REALTIME REPLICATION (Đồng bộ tức thì lịch thuốc & thông báo giữa 2 bên)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- 2. BỔ SUNG CÁC CỘT CÒN THIẾU CHO BẢNG PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'elderly';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 3. BỔ SUNG CỘT LƯU ẢNH MINH CHỨNG VỈ THUỐC VÀO BẢNG REMINDERS
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. BỔ SUNG CỘT QUAN HỆ GIA ĐÌNH VÀO BẢNG FAMILY_LINKS
ALTER TABLE public.family_links ADD COLUMN IF NOT EXISTS relationship TEXT DEFAULT 'Người thân';

-- 5. TẠO BẢNG HỒ SƠ TÀI LIỆU Y TẾ (Giấy ra viện, biên bản mổ, đơn thuốc AI bóc tách)
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  date TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  doctor_name TEXT,
  diagnosis TEXT,
  procedure_name TEXT,
  summary TEXT NOT NULL,
  treatment_plan TEXT,
  cautions JSONB DEFAULT '[]'::jsonb,
  key_metrics JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to medical_documents" ON public.medical_documents;
CREATE POLICY "Allow all access to medical_documents" ON public.medical_documents
  FOR ALL USING (true) WITH CHECK (true);

-- 6. TẠO BẢNG CẢNH BÁO SOS KHẨN CẤP ĐỒNG BỘ ĐÁM MÂY (EMERGENCY_ALERTS)
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  google_maps_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to emergency_alerts" ON public.emergency_alerts;
CREATE POLICY "Allow all access to emergency_alerts" ON public.emergency_alerts
  FOR ALL USING (true) WITH CHECK (true);

-- Đưa bảng emergency_alerts và medical_documents vào Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emergency_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medical_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_documents;
  END IF;
END $$;

-- 7. KHỞI TẠO VÀ PHÂN QUYỀN CHO STORAGE BUCKET 'medication_images'
-- (Bắt buộc để lưu và xem ảnh vỉ thuốc, ảnh tài liệu khám bệnh)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medication_images', 'medication_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public view access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow all for medication_images" ON storage.objects;

CREATE POLICY "Allow all for medication_images" ON storage.objects
  FOR ALL
  USING (bucket_id = 'medication_images')
  WITH CHECK (bucket_id = 'medication_images');
