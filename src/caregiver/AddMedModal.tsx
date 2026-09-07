import { useState, useRef } from "react";
import { X, Clock, Pill, Check, Camera, Loader2, Calendar, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { addMedicationWithCourse } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  patientId?: string;
}

interface TimeSlot {
  id: string;
  label: string;
  defaultTime: string;
}

const AVAILABLE_SLOTS: TimeSlot[] = [
  { id: "morning", label: "Sáng", defaultTime: "08:00" },
  { id: "noon", label: "Trưa", defaultTime: "12:00" },
  { id: "evening", label: "Tối", defaultTime: "20:00" },
  { id: "bedtime", label: "Trước ngủ", defaultTime: "22:00" },
];

export default function AddMedModal({ isOpen, onClose, onAdd, patientId }: Props) {
  const { linkedPatientId } = useFamily();
  const effectivePatientId = patientId || linkedPatientId;
  
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("1 viên");
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["08:00"]);
  const [instruction, setInstruction] = useState("Uống sau ăn");
  const [note, setNote] = useState("");
  
  // Lộ trình điều trị (Treatment Course Duration)
  const [durationDays, setDurationDays] = useState<number>(7);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickMeds = [
    { name: "Amlodipine 5mg", times: ["08:00"], instruction: "Uống sau ăn sáng", days: 30 },
    { name: "Metformin 500mg", times: ["08:00", "12:00"], instruction: "Uống ngay sau ăn", days: 30 },
    { name: "Panadol Extra", times: ["08:00", "20:00"], instruction: "Uống sau ăn", days: 5 },
    { name: "Augmentin 1g", times: ["08:00", "20:00"], instruction: "Uống sau ăn 30 phút", days: 7 },
    { name: "Atorvastatin 10mg", times: ["20:00"], instruction: "Uống buổi tối", days: 30 },
  ];

  const handleQuickSelect = (m: any) => {
    setName(m.name);
    setSelectedTimes(m.times || ["08:00"]);
    setInstruction(m.instruction);
    setDurationDays(m.days || 7);
  };

  const toggleSlot = (slot: TimeSlot) => {
    if (selectedTimes.includes(slot.defaultTime)) {
      if (selectedTimes.length > 1) {
        setSelectedTimes(selectedTimes.filter(t => t !== slot.defaultTime));
      } else {
        alert("Phải có ít nhất 1 cữ uống trong ngày!");
      }
    } else {
      setSelectedTimes([...selectedTimes, slot.defaultTime].sort());
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Tính ngày kết thúc dự kiến
  const startD = new Date(startDate);
  const endD = new Date(startD);
  endD.setDate(endD.getDate() + Math.max(1, durationDays) - 1);
  const formatDateVN = (d: Date) => 
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  const totalDoses = durationDays * selectedTimes.length;

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

      await addMedicationWithCourse({
        patientId: effectivePatientId,
        name: name.trim(),
        dosage,
        instructions: fullInstruction,
        dailyTimes: selectedTimes,
        startDate,
        durationDays,
        imageUrl
      });

      alert(`✅ Đã lên lịch thành công cho thuốc "${name.trim()}"!\nLộ trình: ${durationDays} ngày (${totalDoses} lần uống)`);
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
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Pill size={22} />
            <h2 className="text-xl text-[#1a2b4b]">Kê đơn & Lên lịch thuốc</h2>
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
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Đơn thuốc phổ biến</label>
          <div className="flex gap-1.5 flex-wrap">
            {quickMeds.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => handleQuickSelect(m)}
                className="text-xs bg-gray-50 hover:bg-blue-50 hover:text-primary border border-gray-100 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer"
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
              placeholder="Ví dụ: Amlodipine 5mg, Paracetamol..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium text-[#1a2b4b] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Liều lượng */}
          <div>
            <label className="text-xs font-bold text-[#1a2b4b] block mb-1.5">Liều lượng mỗi lần uống *</label>
            <input 
              type="text" 
              required
              placeholder="Ví dụ: 1 viên, 2 gói, 5ml..." 
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium text-[#1a2b4b] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Các cữ uống trong ngày */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#1a2b4b] flex items-center gap-1">
                <Clock size={14} /> Các cữ uống trong ngày *
              </label>
              <span className="text-[11px] text-primary font-bold">
                {selectedTimes.length} cữ/ngày
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_SLOTS.map((slot) => {
                const isSelected = selectedTimes.includes(slot.defaultTime);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={cn(
                      "py-2.5 px-2 rounded-2xl text-center border-2 transition-all cursor-pointer flex flex-col items-center",
                      isSelected 
                        ? "bg-primary text-white border-primary shadow-sm" 
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    <span className="text-xs font-bold">{slot.label}</span>
                    <span className="text-[11px] opacity-80 mt-0.5">{slot.defaultTime}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LỘ TRÌNH ĐIỀU TRỊ (TỪ NGÀY - ĐẾN NGÀY) */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#1a2b4b] flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar size={15} className="text-primary" /> Lộ trình điều trị (Theo đơn)
              </label>
              <span className="text-xs font-bold bg-primary text-white px-2.5 py-0.5 rounded-full">
                {durationDays} ngày
              </span>
            </div>

            {/* Nút chọn nhanh số ngày */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 3, label: "3 ngày" },
                { days: 5, label: "5 ngày" },
                { days: 7, label: "7 ngày (1 tuần)" },
                { days: 14, label: "14 ngày (2 tuần)" },
                { days: 30, label: "30 ngày (1 tháng)" },
                { days: 90, label: "90 ngày (Dài hạn)" },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDurationDays(opt.days)}
                  className={cn(
                    "py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                    durationDays === opt.days
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-blue-100/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Chọn ngày bắt đầu */}
            <div className="pt-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-600 font-semibold shrink-0">Bắt đầu từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-[#1a2b4b] focus:border-primary outline-none"
              />
            </div>

            {/* Tóm tắt lịch trình */}
            <div className="bg-white rounded-xl p-2.5 text-xs text-[#1a2b4b] border border-blue-100 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span>
                Uống từ <strong>{formatDateVN(startD)}</strong> đến <strong>{formatDateVN(endD)}</strong> • Tự động tạo <strong>{totalDoses} lần nhắc</strong>
              </span>
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
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    instruction === opt 
                      ? "bg-blue-50 border-primary text-primary" 
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  )}
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
              placeholder="Ví dụ: Uống kèm nhiều nước ấm..." 
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
                <span className="text-[10px] text-gray-400">Giúp người cao tuổi nhận biết chính xác mặt thuốc</span>
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
                  <span>Đang lên lịch {totalDoses} lần uống...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>Lên lịch lộ trình {durationDays} ngày ({totalDoses} lần)</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
