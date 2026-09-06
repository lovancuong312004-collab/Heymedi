import { useState, useRef } from "react";
import { X, Plus, Clock, Pill, FileText, Check, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { addMedicationAndReminder } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void; // Called on success to trigger refresh if needed
}

export default function AddMedModal({ isOpen, onClose, onAdd }: Props) {
  const { linkedPatientId, patientInfo } = useFamily();
  const patientName = patientInfo?.name || (patientInfo?.email ? patientInfo.email.split("@")[0] : "Thành viên");
  
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
    if (!linkedPatientId) {
      alert("Lỗi: Không tìm thấy ID bệnh nhân (linkedPatientId null)");
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
      
      console.log("=== DEBUG ADD MED ===", { linkedPatientId, name, dosage, fullInstruction, time, imageUrl });
      
      await addMedicationAndReminder(
        linkedPatientId,
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

  const handlePeriodChange = (newPeriod: "Sáng" | "Trưa" | "Tối" | "Trước ngủ") => {
    setPeriod(newPeriod);
    if (newPeriod === "Sáng") setTime("08:00");
    else if (newPeriod === "Trưa") setTime("12:00");
    else if (newPeriod === "Tối") setTime("20:00");
    else setTime("22:00");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Plus size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A2B4B]">Thêm thuốc cho {patientName || "người bệnh"}</h3>
              <p className="text-gray-400 text-xs">Cài đặt giờ và hướng dẫn uống thuốc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Quick suggestions */}
          <div>
            <span className="text-xs font-bold text-gray-500 mb-1.5 block">Gợi ý thuốc nhanh phổ biến:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickMeds.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickSelect(m)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    name === m.name
                      ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Tên thuốc (*)</label>
            <div className="flex items-center border-2 border-gray-200 rounded-2xl px-3.5 py-3 focus-within:border-emerald-600 bg-gray-50/50">
              <Pill size={18} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Metformin 500mg, Panadol..."
                className="w-full bg-transparent text-[#1A2B4B] font-semibold text-sm outline-none placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>
          </div>

          {/* Dosage & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Liều lượng</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="1 viên"
                className="w-full border-2 border-gray-200 rounded-2xl px-3.5 py-2.5 bg-gray-50/50 text-sm font-semibold text-[#1A2B4B] outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Giờ nhắc</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-3 py-2 bg-gray-50/50 focus-within:border-emerald-600">
                <Clock size={16} className="text-gray-400 mr-1.5 shrink-0" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-[#1A2B4B] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Period selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Buổi uống trong ngày</label>
            <div className="grid grid-cols-4 gap-2">
              {(["Sáng", "Trưa", "Tối", "Trước ngủ"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`py-2 px-1 text-xs rounded-xl font-bold border transition-all ${
                    period === p
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Cách dùng</label>
            <div className="grid grid-cols-3 gap-2">
              {["Uống sau ăn", "Uống trước ăn", "Uống cùng nước ấm"].map((inst) => (
                <button
                  type="button"
                  key={inst}
                  onClick={() => setInstruction(inst)}
                  className={`py-2 px-1 text-[11px] rounded-xl font-semibold border transition-all ${
                    instruction === inst
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Lời dặn riêng cho {patientName || "người bệnh"}</label>
            <div className="flex items-start border-2 border-gray-200 rounded-2xl p-3 focus-within:border-emerald-600 bg-gray-50/50">
              <FileText size={16} className="text-gray-400 mr-2 mt-0.5 shrink-0" />
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Nhớ uống nhiều nước nhé..."
                className="w-full bg-transparent text-sm text-[#1A2B4B] outline-none resize-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Ảnh thuốc (Tùy chọn)</label>
            
            <input 
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />

            {imagePreview ? (
              <div className="relative w-full h-32 rounded-2xl overflow-hidden border-2 border-gray-200">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Camera size={24} />
                  <span className="text-xs font-semibold">Chụp ảnh</span>
                </button>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <ImageIcon size={24} />
                  <span className="text-xs font-semibold">Tải ảnh lên</span>
                </button>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:active:scale-100 active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {isSubmitting ? "Đang lưu..." : `Lưu vào lịch thuốc của ${patientName || "người bệnh"}`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
