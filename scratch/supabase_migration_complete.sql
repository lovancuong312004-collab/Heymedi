-- ================================================================
-- HEYMEDI DATABASE MIGRATION SCRIPT (CHẠY TRÊN SUPABASE SQL EDITOR)
-- ================================================================

-- 1. Bổ sung các cột còn thiếu vào bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'elderly';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Bổ sung các cột còn thiếu vào bảng reminders
-- Cột proof_image_url: lưu URL ảnh vỉ thuốc mà người già chụp gửi cho con
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Bổ sung cột còn thiếu vào bảng family_links
ALTER TABLE public.family_links ADD COLUMN IF NOT EXISTS relationship TEXT DEFAULT 'Người thân';

-- 4. Tạo bảng medical_documents (Lưu hồ sơ bệnh án, giấy ra viện, biên bản mổ, đơn thuốc AI bóc tách)
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

-- Kích hoạt RLS và tạo policy cho phép đọc/ghi bảng medical_documents
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to medical_documents" ON public.medical_documents;
CREATE POLICY "Allow all access to medical_documents" ON public.medical_documents
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Cấu hình Storage Bucket 'medication_images' & Phân quyền RLS
-- Đảm bảo bucket medication_images tồn tại và ở chế độ Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('medication_images', 'medication_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Xóa các policy cũ liên quan đến medication_images để tránh lỗi conflict
DROP POLICY IF EXISTS "Allow public view access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow all for medication_images" ON storage.objects;

-- Cấp quyền xem, tải lên, cập nhật ảnh vỉ thuốc và ảnh tài liệu trong bucket medication_images
CREATE POLICY "Allow all for medication_images" ON storage.objects
  FOR ALL
  USING (bucket_id = 'medication_images')
  WITH CHECK (bucket_id = 'medication_images');
