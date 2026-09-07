import { useState, useRef } from "react";
import { X, Clock, Pill, Check, Camera, Loader2, Calendar, Sparkles, Upload, RotateCcw, Edit3 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { addMedicationWithCourse } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { cn } from "../lib/utils";
import ElderlyCameraCaptureModal from "../components/ElderlyCameraCaptureModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  patientId?: string;
}

interface TimeSlot {
  id: string;
  label: string;
  mealRelation: string;
  defaultTime: string;
}

const AVAILABLE_SLOTS: TimeSlot[] = [
  { id: "morning_post", label: "Sáng (Sau ăn)", mealRelation: "Sau ăn sáng", defaultTime: "08:00" },
  { id: "morning_pre", label: "Sáng (Trước ăn)", mealRelation: "Trước ăn sáng", defaultTime: "06:45" },
  { id: "noon_post", label: "Trưa (Sau ăn)", mealRelation: "Sau ăn trưa", defaultTime: "12:30" },
  { id: "evening_post", label: "Tối (Sau ăn)", mealRelation: "Sau ăn tối", defaultTime: "19:30" },
  { id: "bedtime", label: "Trước khi ngủ", mealRelation: "Trước ngủ", defaultTime: "21:30" },
  { id: "sos", label: "Khi đau / Cần", mealRelation: "Khi đau", defaultTime: "12:30" },
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
  const [isCourseEnabled, setIsCourseEnabled] = useState<boolean>(true);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [customDaysInput, setCustomDaysInput] = useState<string>("");
  const [isCustomDays, setIsCustomDays] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickMeds = [
    { name: "Amlodipine 5mg", times: ["08:00"], instruction: "Uống sau ăn sáng 30 phút", days: 30 },
    { name: "Paracetamol 500mg", times: ["12:30"], instruction: "Khi đau khớp gối, sau ăn", days: 7 },
    { name: "Vitamin C 1000mg", times: ["08:30"], instruction: "Hòa tan trong 200ml nước, sau ăn sáng", days: 10 },
    { name: "Omega-3 1000mg", times: ["12:30"], instruction: "Uống sau ăn trưa", days: 30 },
    { name: "Metformin 500mg", times: ["08:00", "12:30"], instruction: "Uống ngay sau ăn", days: 30 },
  ];

  const handleQuickSelect = (m: any) => {
    setName(m.name);
    setSelectedTimes(m.times || ["08:00"]);
    setInstruction(m.instruction);
    setDurationDays(m.days || 7);
    setIsCourseEnabled(true);
    setIsCustomDays(false);
    setCustomDaysInput("");
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

  const updateCustomTime = (index: number, newTime: string) => {
    const updated = [...selectedTimes];
    updated[index] = newTime;
    setSelectedTimes(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImageBlob(null);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Tính ngày kết thúc dự kiến
  const effectiveDuration = isCourseEnabled ? Math.max(1, durationDays) : 1;
  const startD = new Date(startDate);
  const endD = new Date(startD);
  endD.setDate(endD.getDate() + effectiveDuration - 1);
  const formatDateVN = (d: Date) => 
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  const totalDoses = effectiveDuration * selectedTimes.length;

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

      // Upload image if exists (hỗ trợ cả chụp trực tiếp từ Camera và chọn File máy)
      if (imageBlob || imageFile) {
        const fileExt = imageFile ? (imageFile.name.split('.').pop() || 'jpg') : 'jpg';
        const fileName = `med_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const payloadToUpload = imageBlob || imageFile!;
        
        const { data, error } = await supabase.storage
          .from('medication_images')
          .upload(fileName, payloadToUpload, { 
            upsert: true,
            contentType: 'image/jpeg'
          });
          
        if (error) {
          console.warn("Upload Supabase storage thất bại, dùng ảnh preview:", error);
          imageUrl = imagePreview;
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
        durationDays: effectiveDuration,
        imageUrl
      });

      alert(`✅ Đã lên lịch thành công cho thuốc "${name.trim()}"!\n${isCourseEnabled ? `Lộ trình: ${effectiveDuration} ngày (${totalDoses} lần uống)` : `Lịch uống 1 ngày (${totalDoses} cữ)`}`);
      onAdd();
      // Reset form
      setName("");
      setNote("");
      setImageFile(null);
      setImageBlob(null);
      setImagePreview(null);
      setIsCustomDays(false);
      setCustomDaysInput("");
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
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#1a2b4b] flex items-center gap-1">
                <Clock size={14} /> Các cữ uống trong ngày *
              </label>
              <span className="text-[11px] text-primary font-bold">
                {selectedTimes.length} cữ/ngày
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_SLOTS.map((slot) => {
                const isSelected = selectedTimes.includes(slot.defaultTime);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={cn(
                      "p-2.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between",
                      isSelected 
                        ? "bg-primary text-white border-primary shadow-sm" 
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    <span className="text-xs font-bold leading-tight">{slot.label}</span>
                    <span className="text-[10px] opacity-80 mt-1 font-mono">{slot.defaultTime}</span>
                  </button>
                );
              })}
            </div>

            {/* Chỉnh sửa giờ chuông báo chính xác cho các cữ đã chọn */}
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 space-y-2">
              <span className="text-[11px] font-extrabold text-[#1a2b4b] block">
                ⏰ Giờ chuông báo cụ thể:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedTimes.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white border border-gray-300 px-2.5 py-1 rounded-xl shadow-xs">
                    <Clock size={12} className="text-primary" />
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => updateCustomTime(idx, e.target.value)}
                      className="text-xs font-black text-primary bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LỘ TRÌNH ĐIỀU TRỊ (TỪ NGÀY - ĐẾN NGÀY) */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-primary" />
                <span className="text-xs font-extrabold text-[#1a2b4b] uppercase tracking-wide">
                  Lộ trình điều trị (Theo đơn)
                </span>
              </div>
              {isCourseEnabled ? (
                <button
                  type="button"
                  onClick={() => setIsCourseEnabled(false)}
                  className="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={11} />
                  <span>Hủy lộ trình (Chỉ 1 ngày)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCourseEnabled(true);
                    if (durationDays <= 1) setDurationDays(7);
                  }}
                  className="text-[11px] font-bold text-primary bg-blue-100/80 hover:bg-blue-200 border border-blue-300 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  + Bật lộ trình nhiều ngày
                </button>
              )}
            </div>

            {isCourseEnabled ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-semibold">Chọn thời gian điều trị:</span>
                  <span className="text-xs font-bold bg-primary text-white px-2.5 py-0.5 rounded-full">
                    {effectiveDuration} ngày
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
                  ].map((opt) => {
                    const isSelected = !isCustomDays && durationDays === opt.days;
                    return (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setIsCourseEnabled(false);
                          } else {
                            setDurationDays(opt.days);
                            setIsCustomDays(false);
                            setCustomDaysInput("");
                          }
                        }}
                        className={cn(
                          "py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center relative",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-blue-100/50"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tùy chọn tự nhập số ngày */}
                <div className="pt-1">
                  {!isCustomDays ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDays(true);
                        setCustomDaysInput(String(durationDays));
                      }}
                      className="w-full py-2 px-3 text-xs font-bold text-primary bg-white border border-dashed border-blue-300 hover:border-primary rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit3 size={13} />
                      <span>Tự nhập số ngày khác (ví dụ: 4 ngày, 10 ngày, 21 ngày...)</span>
                    </button>
                  ) : (
                    <div className="bg-white border-2 border-primary rounded-xl p-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 shrink-0">Nhập số ngày:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        autoFocus
                        placeholder="VD: 4, 10, 21..."
                        value={customDaysInput}
                        onChange={(e) => {
                          setCustomDaysInput(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setDurationDays(val);
                          }
                        }}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-black text-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDays(false);
                          setCustomDaysInput("");
                        }}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-gray-100 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  )}
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
              </>
            ) : (
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#1a2b4b]">
                  <Check size={14} className="text-emerald-600" />
                  <span>Chế độ: Uống hôm nay (1 ngày)</span>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Thuốc chỉ lên lịch nhắc trong ngày hôm nay ({totalDoses} cữ), không tự động tạo lịch cho các ngày sau.
                </p>
              </div>
            )}
          </div>

          {/* Cách dùng (Hỗ trợ bấm lại để hủy chọn) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1a2b4b]">Hướng dẫn dùng</label>
              <span className="text-[10px] text-gray-400 italic">Bấm lại vào lựa chọn để hủy chọn</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Uống trước ăn", "Uống sau ăn", "Uống khi đói"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstruction(prev => prev === opt ? "" : opt)}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer relative",
                    instruction === opt 
                      ? "bg-blue-50 border-primary text-primary shadow-xs" 
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <span>{opt}</span>
                  {instruction === opt && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
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
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="space-y-2">
                <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-primary/30 bg-gray-900 flex items-center justify-center">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImageBlob(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-blue-50 text-primary hover:bg-blue-100 text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200 cursor-pointer transition-colors"
                  >
                    <Camera size={14} />
                    <span>Chụp lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 text-xs font-bold flex items-center justify-center gap-1.5 border border-gray-200 cursor-pointer transition-colors"
                  >
                    <Upload size={14} />
                    <span>Đổi ảnh khác</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="p-4 rounded-2xl border-2 border-primary/30 hover:border-primary bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
                    <Camera size={20} />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-black text-primary block">Chụp ảnh Camera</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Mở máy ảnh chụp vỉ/hộp</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100/70 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <div className="w-11 h-11 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-gray-700 block">Tải ảnh từ máy</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Chọn tệp ảnh có sẵn</span>
                  </div>
                </button>
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
                  <span>
                    {isCourseEnabled 
                      ? `Lên lịch lộ trình ${effectiveDuration} ngày (${totalDoses} lần)` 
                      : `Lên lịch uống 1 ngày (${totalDoses} cữ)`}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* Modal Camera Chụp Vỉ Thuốc Trực Tiếp */}
      {isCameraOpen && (
        <ElderlyCameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          title={`Chụp Vỉ Thuốc: ${name || "Thuốc mới"}`}
          subtitle="Chụp vỉ hoặc hộp thuốc thực tế để người cao tuổi dễ nhận diện"
          guideText="ĐẶT VỈ HOẶC HỘP THUỐC VÀO CHÍNH GIỮA KHUNG HÌNH"
          confirmButtonText="DÙNG ẢNH VỈ THUỐC NÀY"
          onCaptureComplete={async (blob, previewUrl) => {
            setImageBlob(blob);
            setImagePreview(previewUrl);
            setImageFile(null);
            setIsCameraOpen(false);
          }}
        />
      )}

    </div>
  );
}
