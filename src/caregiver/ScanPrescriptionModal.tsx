import { useState, useRef } from "react";
import { X, Camera, Scan, Check, Loader2, Trash2, Clock, Sparkles } from "lucide-react";
import { analyzePrescription, type ParsedMedication } from "../utils/geminiVision";
import { addMedicationWithCourse } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_SLOTS = [
  { label: "Sáng", time: "08:00" },
  { label: "Trưa", time: "12:00" },
  { label: "Tối", time: "20:00" },
  { label: "Trước ngủ", time: "22:00" },
];

export default function ScanPrescriptionModal({ isOpen, onClose, onSuccess }: Props) {
  const { linkedPatientId } = useFamily();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [medsList, setMedsList] = useState<ParsedMedication[]>([]);
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [commonStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      
      // Tự động phân tích ảnh
      await runAIAnalysis(file);
    }
  };

  const runAIAnalysis = async (file: File) => {
    try {
      setIsScanning(true);
      const results = await analyzePrescription(file);
      if (results.length > 0) {
        setMedsList(results);
        setStep("review");
      } else {
        alert("Không tìm thấy thuốc nào trong ảnh. Vui lòng chụp lại đơn thuốc rõ ràng hơn.");
        resetState();
      }
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra khi quét đơn thuốc");
      resetState();
    } finally {
      setIsScanning(false);
    }
  };

  const resetState = () => {
    setImageFile(null);
    setImagePreview(null);
    setMedsList([]);
    setStep("capture");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const removeMed = (index: number) => {
    setMedsList(prev => prev.filter((_, i) => i !== index));
    if (medsList.length === 1) {
      resetState();
    }
  };

  const updateMed = (index: number, field: keyof ParsedMedication, value: any) => {
    setMedsList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  const toggleMedTime = (index: number, timeStr: string) => {
    setMedsList(prev => {
      const newList = [...prev];
      const currentTimes = newList[index].times || [];
      if (currentTimes.includes(timeStr)) {
        if (currentTimes.length > 1) {
          newList[index].times = currentTimes.filter(t => t !== timeStr);
        }
      } else {
        newList[index].times = [...currentTimes, timeStr].sort();
      }
      return newList;
    });
  };

  const handleSaveAll = async () => {
    if (!linkedPatientId) {
      alert("Lỗi: Không tìm thấy ID bệnh nhân liên kết");
      return;
    }
    if (medsList.length === 0) {
      alert("Không có thuốc nào để lưu");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = null;

      // Tải ảnh đơn thuốc gốc lên storage để làm minh chứng
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `rx_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data } = await supabase.storage
          .from('medication_images')
          .upload(fileName, imageFile, { upsert: true });
        
        if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('medication_images')
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      let totalRemindersCreated = 0;

      // Lưu từng thuốc cùng toàn bộ lộ trình điều trị của nó
      for (const med of medsList) {
        const times = med.times && med.times.length > 0 ? med.times : ["08:00"];
        const duration = med.duration_days && med.duration_days > 0 ? med.duration_days : 7;
        
        await addMedicationWithCourse({
          patientId: linkedPatientId,
          name: med.name,
          dosage: med.dosage || "1 viên",
          instructions: med.instructions || "Uống theo đơn bác sĩ",
          dailyTimes: times,
          startDate: commonStartDate,
          durationDays: duration,
          imageUrl
        });

        totalRemindersCreated += times.length * duration;
      }
      
      alert(`🎉 Đã lên lịch thành công ${medsList.length} loại thuốc từ đơn khám!\nTổng cộng: ${totalRemindersCreated} lần nhắc thuốc tự động.`);
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error(error);
      alert(`Có lỗi xảy ra khi lưu: ${error.message || "Vui lòng thử lại"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-primary flex items-center justify-center font-bold">
              <Scan size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#1A2B4B]">Quét Đơn Thuốc Bác Sĩ (AI)</h3>
              <p className="text-gray-400 text-xs font-semibold">Tự động nhận diện liều lượng & lộ trình điều trị</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isScanning || isSaving}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {step === "capture" ? (
            <div className="flex flex-col items-center justify-center py-8">
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              
              {isScanning ? (
                <div className="flex flex-col items-center justify-center text-primary gap-4 py-10">
                  <div className="relative">
                    <Loader2 size={56} className="animate-spin text-primary" />
                    <Sparkles size={24} className="absolute -top-1 -right-1 text-amber-500 animate-bounce" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-lg text-[#1A2B4B]">AI đang đọc & phân tích đơn thuốc...</p>
                    <p className="text-xs text-gray-500 font-medium">Bóc tách tên thuốc, liều dùng, cữ uống và số ngày</p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-blue-50/70 to-indigo-50/70 text-primary border-2 border-dashed border-[#B3CCFF] rounded-[28px] p-8 hover:bg-blue-100/50 transition-all cursor-pointer"
                  >
                    <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center text-primary">
                      <Camera size={38} />
                    </div>
                    <div className="text-center">
                      <span className="font-extrabold text-xl block text-[#1A2B4B]">Chụp Ảnh Đơn Thuốc</span>
                      <span className="text-sm text-gray-500 mt-1 block font-medium">Hoặc tải ảnh từ thư viện của bạn</span>
                    </div>
                  </button>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                    <div className="font-black flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Hệ thống AI sẽ tự động:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                      <li>Bóc tách danh sách toàn bộ các loại thuốc trong đơn.</li>
                      <li>Phân loại cữ uống trong ngày (Sáng, Trưa, Tối, Trước ngủ).</li>
                      <li>Nhận diện lộ trình điều trị theo số ngày kê đơn (5 ngày, 7 ngày, 14 ngày, 30 ngày...).</li>
                      <li>Cho phép người nhà kiểm tra và chỉnh sửa trước khi lên lịch.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-blue-50/80 px-4 py-3 rounded-2xl border border-blue-100">
                <div>
                  <span className="font-extrabold text-[#1A2B4B] text-sm block">Đã nhận diện {medsList.length} loại thuốc</span>
                  <span className="text-[11px] text-gray-500">Bắt đầu uống từ hôm nay</span>
                </div>
                <button 
                  onClick={resetState} 
                  className="text-xs text-primary font-bold bg-white px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50"
                >
                  Chụp lại
                </button>
              </div>
              
              {/* Danh sách các thuốc đã nhận diện */}
              {medsList.map((med, idx) => (
                <div key={idx} className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 relative space-y-3 shadow-sm">
                  <button 
                    onClick={() => removeMed(idx)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-white text-rose-600 border border-red-200 shadow-sm rounded-full flex items-center justify-center hover:bg-red-50 cursor-pointer"
                    title="Xóa thuốc này"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  {/* Tên thuốc */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Tên thuốc #{idx + 1}</label>
                    <input 
                      value={med.name} 
                      onChange={(e) => updateMed(idx, 'name', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-[#1A2B4B] focus:border-primary outline-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Liều lượng */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Liều mỗi lần</label>
                      <input 
                        value={med.dosage} 
                        onChange={(e) => updateMed(idx, 'dosage', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1A2B4B] focus:border-primary outline-none"
                      />
                    </div>

                    {/* Lộ trình số ngày */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Lộ trình (ngày)</label>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          min="1"
                          max="365"
                          value={med.duration_days || 7} 
                          onChange={(e) => updateMed(idx, 'duration_days', parseInt(e.target.value) || 7)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-primary focus:border-primary outline-none"
                        />
                        <span className="text-xs text-gray-500 font-bold shrink-0">ngày</span>
                      </div>
                    </div>
                  </div>

                  {/* Cữ uống trong ngày */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock size={12} /> Cữ uống trong ngày
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AVAILABLE_SLOTS.map((slot) => {
                        const isSelected = (med.times || []).includes(slot.time);
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => toggleMedTime(idx, slot.time)}
                            className={cn(
                              "py-1.5 px-1 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            <span>{slot.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Cách dùng */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hướng dẫn dùng</label>
                    <input 
                      value={med.instructions} 
                      onChange={(e) => updateMed(idx, 'instructions', e.target.value)}
                      placeholder="VD: Uống sau bữa ăn sáng 30 phút"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#1A2B4B] focus:border-primary outline-none"
                    />
                  </div>
                </div>
              ))}

              {/* Nút thêm thuốc thủ công vào đơn */}
              <button
                type="button"
                onClick={() => {
                  setMedsList(prev => [
                    ...prev,
                    {
                      name: "",
                      dosage: "1 viên",
                      times: ["08:00"],
                      time: "Sáng",
                      duration_days: 7,
                      instructions: "Uống sau ăn"
                    }
                  ]);
                }}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                + Thêm loại thuốc khác vào đơn này
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleSaveAll}
              disabled={isSaving || medsList.length === 0}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-70 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {isSaving ? "Đang tạo lịch trình..." : `XÁC NHẬN LÊN LỊCH ${medsList.length} LOẠI THUỐC`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
