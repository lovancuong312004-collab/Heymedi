import { supabase } from "../lib/supabase";

export type MedicalDocType = 
  | "prescription"       // Đơn thuốc bác sĩ
  | "discharge_paper"    // Giấy ra viện / Tóm tắt bệnh án
  | "surgery_record"     // Hồ sơ / Biên bản phẫu thuật, thủ thuật
  | "lab_test"           // Kết quả xét nghiệm / Chẩn đoán hình ảnh
  | "consultation"       // Phiếu khám bệnh / Tái khám
  | "other";             // Tài liệu y khoa khác

export interface MedicalDocumentRecord {
  id: string;
  patientId: string;
  type: MedicalDocType;
  title: string;
  imageUrl?: string;
  date: string;              // Ngày khám / Ngày mổ / Ngày ra viện
  hospitalName: string;      // Tên cơ sở y tế (Bệnh viện, Phòng khám)
  doctorName?: string;       // Bác sĩ điều trị / Phẫu thuật viên
  diagnosis?: string;        // Chẩn đoán y khoa chính thức
  procedureName?: string;    // Tên phương pháp phẫu thuật / Can thiệp
  summary: string;           // Tóm tắt y khoa bóc tách ngắn gọn, súc tích
  treatmentPlan?: string;    // Lời dặn dò, phác đồ điều trị, chăm sóc hậu phẫu
  cautions?: string[];       // Cảnh báo y khoa / Dấu hiệu cần tái khám khẩn cấp
  keyMetrics?: string[];     // Các chỉ số bất thường hoặc quan trọng
  createdAt: string;
}

const STORAGE_PREFIX = "patient_medical_documents_";

/**
 * Tải ảnh tài liệu lên Supabase Storage hoặc chuyển thành Data URL an toàn
 */
export async function uploadMedicalDocumentImage(file: File): Promise<string> {
  try {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Thử upload lên Supabase storage bucket 'medication_images' đã có sẵn
    const { data, error } = await supabase.storage
      .from("medication_images")
      .upload(fileName, file, { upsert: true });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage
        .from("medication_images")
        .getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Upload to Supabase Storage failed, falling back to base64 DataURL:", err);
  }

  // Fallback an toàn tuyệt đối: đọc thành base64 Data URL để không bao giờ bị mất ảnh
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Lưu hồ sơ tài liệu khám chữa bệnh / phẫu thuật / đơn thuốc vào hệ thống
 */
export async function saveMedicalDocument(
  patientId: string,
  docData: Omit<MedicalDocumentRecord, "id" | "patientId" | "createdAt">
): Promise<MedicalDocumentRecord> {
  const newDoc: MedicalDocumentRecord = {
    id: `meddoc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    patientId,
    ...docData,
    createdAt: new Date().toISOString()
  };

  try {
    // 1. Lưu vào localStorage cho truy xuất tức thì & offline
    const key = `${STORAGE_PREFIX}${patientId}`;
    const raw = localStorage.getItem(key);
    const list: MedicalDocumentRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(newDoc);
    localStorage.setItem(key, JSON.stringify(list));

    // 2. Thử lưu vào Supabase table 'medical_documents' nếu database có sẵn
    try {
      await supabase.from("medical_documents").insert({
        id: newDoc.id,
        patient_id: patientId,
        type: newDoc.type,
        title: newDoc.title,
        image_url: newDoc.imageUrl || null,
        date: newDoc.date,
        hospital_name: newDoc.hospitalName,
        doctor_name: newDoc.doctorName || null,
        diagnosis: newDoc.diagnosis || null,
        procedure_name: newDoc.procedureName || null,
        summary: newDoc.summary,
        treatment_plan: newDoc.treatmentPlan || null,
        cautions: newDoc.cautions || [],
        key_metrics: newDoc.keyMetrics || [],
        created_at: newDoc.createdAt
      });
    } catch {
      // Bỏ qua nếu bảng chưa được tạo trên cloud
    }
  } catch (err) {
    console.error("saveMedicalDocument error:", err);
  }

  return newDoc;
}

/**
 * Lấy danh sách tất cả tài liệu y tế của bệnh nhân
 */
export function getMedicalDocuments(patientId: string): MedicalDocumentRecord[] {
  if (!patientId) return [];
  try {
    const key = `${STORAGE_PREFIX}${patientId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list: MedicalDocumentRecord[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Xóa một tài liệu y tế
 */
export function deleteMedicalDocument(patientId: string, docId: string): boolean {
  if (!patientId || !docId) return false;
  try {
    const key = `${STORAGE_PREFIX}${patientId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const list: MedicalDocumentRecord[] = JSON.parse(raw);
    const updated = list.filter((item) => item.id !== docId);
    localStorage.setItem(key, JSON.stringify(updated));

    // Xóa trên Supabase nếu có
    try {
      supabase.from("medical_documents").delete().eq("id", docId).then(() => {});
    } catch {
      // ignore
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Trả về thông tin hiển thị định dạng cho từng loại tài liệu
 */
export function getDocumentTypeInfo(type: MedicalDocType): {
  label: string;
  badgeColor: string;
  iconBg: string;
} {
  switch (type) {
    case "surgery_record":
      return {
        label: "Biên bản Phẫu thuật",
        badgeColor: "bg-red-50 text-red-700 border-red-200",
        iconBg: "bg-red-100 text-red-600"
      };
    case "discharge_paper":
      return {
        label: "Giấy Ra Viện",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-600"
      };
    case "prescription":
      return {
        label: "Đơn Thuốc Bác Sĩ",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-100 text-primary"
      };
    case "lab_test":
      return {
        label: "Xét Nghiệm / Cận Lâm Sàng",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        iconBg: "bg-amber-100 text-amber-600"
      };
    case "consultation":
      return {
        label: "Phiếu Khám Bệnh",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        iconBg: "bg-purple-100 text-purple-600"
      };
    default:
      return {
        label: "Tài Liệu Y Khoa",
        badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
        iconBg: "bg-gray-100 text-gray-600"
      };
  }
}
