import { useState, useRef } from "react";
import { X, Clock, Pill, Check, Camera, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { addMedicationAndReminder } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  patientId?: string;
}

export default function AddMedModal({ isOpen, onClose, onAdd, patientId }: Props) {
  const { linkedPatientId } = useFamily();
  const effectivePatientId = patientId || linkedPatientId;
  
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("1 viên");
  const [period, setPeriod] = useState<"Sáng" | "Trưa" | "Tối" | "Trước ngủ">("Sáng");
  const [time, setTime] = useState("08:00");
  const [instruction, setInstruction] = useState("Uống sau ăn");
  const [note, setNote] = useState("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickMeds = [
    { name: "Amlodipine 5mg", period: "Sáng", time: "08:00", instruction: "Uống sau ăn sáng" },
    { name: "Metformin 500mg", period: "Trưa", time: "12:00", instruction: "Uống sau ăn trưa" },
    { name: "Atorvastatin 10mg", period: "Tối", time: "20:00", instruction: "Uống sau ăn tối" },
    { name: "Vitamin B1 250mg", period: "Trước ngủ", time: "22:00", instruction: "Uống trước khi ngủ" },
  ];

  const handleQuickSelect = (m: any) => {
    setName(m.name);
    setPeriod(m.period);
    setTime(m.time);
    setInstruction(m.instruction);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Vui lòng nhập tên thuốc");
      return;
    }
    if (!effectivePatientId) {
      alert("Lỗi: Không tìm thấy ID bệnh nhân");
      return;
    }

    try {
      setIsSubmitting(true);
      let imageUrl = null;

      // Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('medication_images')
          .upload(fileName, imageFile, { upsert: true });
          
        if (error) {
          console.error("Upload error:", error);
          alert("Lỗi khi tải ảnh lên. Vẫn tiếp tục lưu thuốc.");
        } else if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('medication_images')
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const fullInstruction = `${instruction} ${note ? `(${note})` : ""}`.trim();
      
      console.log("=== DEBUG ADD MED ===", { effectivePatientId, name, dosage, fullInstruction, time, imageUrl });
      
      await addMedicationAndReminder(
        effectivePatientId,
        name,
        dosage,
        fullInstruction,
        time,
        imageUrl
      );

      onAdd();
      // Reset form
      setName("");
      setNote("");
      setImageFile(null);
      setImagePreview(null);
      onClose();
    } catch (err: any) {
      console.error("ADD_MED_ERROR:", err);
      alert(`LỖI THÊM THUỐC: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Pill size={22} />
            <h2 className="text-xl text-[#1a2b4b]">Thêm thuốc mới</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick select tags */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Gợi ý nhanh</label>
          <div className="flex gap-1.5 flex-wrap">
            {quickMeds.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => handleQuickSelect(m)}
                className="text-xs bg-gray-50 hover:bg-blue-50 hover:text-primary border border-gray-100 px-3 py-1.5 rounded-full font-medium transition-colors"
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Tên thuốc */}
          <div>
            <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Tên thuốc *</label>
            <input 
              type="text" 
              required
              placeholder="Ví dụ: Amlodipine, Paracetamol..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium text-[#1a2b4b] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Liều lượng */}
          <div>
            <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Liều lượng *</label>
            <input 
              type="text" 
              required
              placeholder="Ví dụ: 1 viên, 2 gói, 5ml..." 
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium text-[#1a2b4b] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Buổi & Giờ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Buổi uống</label>
              <select 
                value={period}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setPeriod(val);
                  if (val === "Sáng") setTime("08:00");
                  if (val === "Trưa") setTime("12:00");
                  if (val === "Tối") setTime("20:00");
                  if (val === "Trước ngủ") setTime("22:00");
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-3 text-sm font-medium text-[#1a2b4b] focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Sáng">Buổi Sáng</option>
                <option value="Trưa">Buổi Trưa</option>
                <option value="Tối">Buổi Tối</option>
                <option value="Trước ngủ">Trước khi ngủ</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5 flex items-center gap-1">
                <Clock size={12} /> Giờ uống
              </label>
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-3 text-sm font-bold text-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Cách dùng */}
          <div>
            <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Hướng dẫn dùng</label>
            <div className="grid grid-cols-3 gap-2">
              {["Uống trước ăn", "Uống sau ăn", "Uống khi đói"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstruction(opt)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                    instruction === opt 
                      ? "bg-blue-50 border-primary text-primary" 
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Ghi chú thêm */}
          <div>
            <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Ghi chú (Tuỳ chọn)</label>
            <input 
              type="text" 
              placeholder="Ví dụ: Uống kèm nhiều nước..." 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium text-[#1a2b4b] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Chụp / Upload ảnh thuốc thật */}
          <div>
            <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Hình ảnh thực tế của thuốc</label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-primary/50 bg-gray-50 hover:bg-blue-50/20 rounded-2xl py-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100/50 flex items-center justify-center text-primary">
                  <Camera size={20} />
                </div>
                <span className="text-xs font-bold text-[#1a2b4b]">Chụp hoặc tải ảnh vỉ/hộp thuốc</span>
                <span className="text-[10px] text-gray-400">Giúp người cao tuổi dễ nhận biết mặt thuốc</span>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Đang lưu thông tin...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>Xác nhận thêm thuốc</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
