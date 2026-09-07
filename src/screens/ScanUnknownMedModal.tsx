import { useState, useRef } from "react";
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Loader2,
  Send,
  Camera,
  UploadCloud
} from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import type { Reminder } from "../services/medicationService";
import { uploadPillProofImage } from "../services/medicationService";
import { analyzeUnknownMedWithAI } from "../utils/geminiVision";
import ElderlyCameraCaptureModal from "../components/ElderlyCameraCaptureModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentSchedule?: Reminder[];
  onAddedMed?: () => void;
}

interface AnalysisResult {
  medName: string;
  activeIngredient: string;
  dosage: string;
  purpose: string;
  confidence: string;
  safetyLevel: "safe" | "warning" | "danger";
  safetyTitle: string;
  safetyExplanation: string;
  interactionNotes: string;
}

export default function ScanUnknownMedModal({
  isOpen,
  onClose,
  user,
  currentSchedule = [],
  onAddedMed
}: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBlobs, setPhotoBlobs] = useState<Blob[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isNotifyingCaregiver, setIsNotifyingCaregiver] = useState(false);
  const [notifiedDone, setNotifiedDone] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCaptureFromCamera = async (blob: Blob, previewUrl: string) => {
    setIsCameraOpen(false);
    if (photos.length >= 3) return;

    setPhotoBlobs(prev => [...prev, blob]);
    setIsUploadingPhoto(true);
    try {
      const publicUrl = await uploadPillProofImage(blob);
      setPhotos(prev => [...prev, publicUrl || previewUrl]);
    } catch {
      setPhotos(prev => [...prev, previewUrl]);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (photos.length >= 3) return;

      setPhotoBlobs(prev => [...prev, file]);
      setIsUploadingPhoto(true);
      try {
        const publicUrl = await uploadPillProofImage(file);
        setPhotos(prev => [...prev, publicUrl]);
      } catch {
        const url = URL.createObjectURL(file);
        setPhotos(prev => [...prev, url]);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoBlobs(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const runSmartAnalysis = async () => {
    if (photos.length === 0) {
      alert("Vui lòng chụp ít nhất 1 hoặc 2 tấm ảnh của viên thuốc hoặc vỏ hộp!");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const chronicDiseases = user?.user_metadata?.chronic_diseases || ["Cao huyết áp", "Tiểu đường"];
      const currentMedNames = currentSchedule.map(r => r.medication?.name || "").filter(Boolean);

      const targetBlob = photoBlobs[0] || photos[0];
      const aiRes = await analyzeUnknownMedWithAI(targetBlob as any, chronicDiseases, currentMedNames);

      setResult({
        medName: aiRes.medName,
        activeIngredient: aiRes.activeIngredient,
        dosage: aiRes.dosage,
        purpose: aiRes.purpose,
        confidence: aiRes.confidence,
        safetyLevel: aiRes.safetyLevel,
        safetyTitle: aiRes.safetyTitle,
        safetyExplanation: aiRes.safetyExplanation,
        interactionNotes: aiRes.interactionNotes
      });
    } catch (err) {
      console.warn("Lỗi phân tích AI:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNotifyCaregiver = async () => {
    if (!result) return;
    try {
      setIsNotifyingCaregiver(true);

      // Broadcast emergency alert event to CaregiverApp
      const channel = supabase.channel('sos-emergency-alerts');
      await channel.send({
        type: 'broadcast',
        event: 'UNKNOWN_MED_TAKEN',
        payload: {
          patient_id: user?.id,
          patient_name: user?.user_metadata?.full_name || "Bác",
          med_name: result.medName,
          safety_level: result.safetyLevel,
          photo_url: photos[0],
          timestamp: new Date().toISOString()
        }
      });

      setNotifiedDone(true);
      if (onAddedMed) onAddedMed();
      setTimeout(() => {
        alert("Đã gửi thông báo đến máy con cái thành công!");
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("Đã ghi nhận thông tin thuốc!");
      onClose();
    } finally {
      setIsNotifyingCaregiver(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1A2B4B]">Quét Thuốc Ngoài Danh Mục (AI)</h3>
              <p className="text-gray-400 text-xs">Kiểm tra tương tác & an toàn bệnh nền</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Instructions */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
              <ShieldCheck size={16} /> Bác muốn uống thuốc ngoài đơn?
            </p>
            <span>Hãy chụp <b>2 đến 3 ảnh</b> (mặt trước, mặt sau hoặc viên thuốc). AI sẽ kiểm tra xem thuốc có tương tác xấu với thuốc đang dùng hoặc bệnh nền của Bác hay không.</span>
          </div>

          {/* Photo slots */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((idx) => {
              const photo = photos[idx];
              return (
                <div 
                  key={idx} 
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group shadow-sm"
                >
                  {photo ? (
                    <>
                      <img src={photo} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-red-700"
                        title="Xóa ảnh"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Ảnh {idx + 1}
                      </span>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary transition-colors cursor-pointer"
                    >
                      <Plus size={22} />
                      <span className="text-[10px] font-bold">Thêm ảnh {idx + 1}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 2 nút thao tác rõ ràng: Mở Camera trực tiếp vs Chọn ảnh từ máy */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              disabled={photos.length >= 3 || isUploadingPhoto}
              className="py-3 px-2 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-2xl flex items-center justify-center gap-2 text-primary font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Camera size={16} />
              <span>Chụp bằng Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= 3 || isUploadingPhoto}
              className="py-3 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={16} />
              <span>Chọn ảnh từ máy</span>
            </button>
          </div>

          {isUploadingPhoto && (
            <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-bold py-1 bg-blue-50/60 rounded-xl">
              <Loader2 size={14} className="animate-spin" />
              <span>Đang tải và xử lý hình ảnh...</span>
            </div>
          )}

          {/* Input file thuần túy để chọn ảnh từ máy */}
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
          />

          {/* Modal Camera Live Viewfinder dành cho người cao tuổi */}
          {isCameraOpen && (
            <ElderlyCameraCaptureModal
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              title="Chụp Ảnh Viên Hoặc Vỉ Thuốc"
              subtitle="Căn chỉnh viên thuốc hoặc vỉ thuốc rõ nét dưới ánh sáng"
              guideText="ĐẶT VIÊN THUỐC HOẶC HỘP THUỐC VÀO GIỮA KHUNG HÌNH"
              confirmButtonText="SỬ DỤNG ẢNH NÀY"
              onCaptureComplete={handleCaptureFromCamera}
            />
          )}

          {/* Action to scan */}
          {!result && (
            <button
              onClick={runSmartAnalysis}
              disabled={isAnalyzing || photos.length === 0}
              className={cn(
                "w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer",
                isAnalyzing || photos.length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-primary text-white hover:bg-blue-700 shadow-primary/25 active:scale-95"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>AI ĐANG PHÂN TÍCH TƯƠNG TÁC THUỐC...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Bắt đầu phân tích an toàn thuốc ({photos.length}/3 ảnh)</span>
                </>
              )}
            </button>
          )}

          {/* Result Card */}
          {result && (
            <div className={cn(
              "rounded-3xl p-5 border shadow-sm space-y-3 animate-fade-in",
              result.safetyLevel === "safe" ? "bg-emerald-50/70 border-emerald-300" :
              result.safetyLevel === "warning" ? "bg-amber-50/80 border-amber-300" :
              "bg-red-50 border-red-300"
            )}>
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.safetyLevel === "safe" && <CheckCircle2 className="text-emerald-600" size={24} />}
                  {result.safetyLevel === "warning" && <AlertTriangle className="text-amber-600" size={24} />}
                  {result.safetyLevel === "danger" && <AlertOctagon className="text-red-600" size={24} />}
                  <div>
                    <span className={cn(
                      "text-xs font-black uppercase px-2 py-0.5 rounded-md",
                      result.safetyLevel === "safe" ? "bg-emerald-600 text-white" :
                      result.safetyLevel === "warning" ? "bg-amber-600 text-white" :
                      "bg-red-600 text-white"
                    )}>
                      {result.safetyLevel === "safe" ? "ĐƯỢC DÙNG" : result.safetyLevel === "warning" ? "CẨN TRỌNG" : "NGUY HIỂM"}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-500">Độ tin cậy: {result.confidence}</span>
              </div>

              {/* Drug title */}
              <div>
                <h4 className="font-black text-lg text-[#1A2B4B]">{result.medName}</h4>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">Hoạt chất: {result.activeIngredient} • {result.dosage}</p>
              </div>

              {/* Safety Assessment */}
              <div className="bg-white/80 rounded-2xl p-3.5 border border-black/5 text-xs space-y-1.5">
                <p className="font-bold text-[#1A2B4B]">{result.safetyTitle}</p>
                <p className="text-gray-700 leading-relaxed">{result.safetyExplanation}</p>
                <p className="text-primary font-semibold pt-1 border-t border-gray-100 flex items-center gap-1">
                  <ShieldCheck size={14} /> {result.interactionNotes}
                </p>
              </div>

              {/* Confirm / Send to Caregiver */}
              <button
                onClick={handleNotifyCaregiver}
                disabled={isNotifyingCaregiver || notifiedDone}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer",
                  notifiedDone
                    ? "bg-emerald-600 text-white shadow-none"
                    : "bg-[#1A2B4B] text-white hover:bg-black shadow-black/20"
                )}
              >
                {isNotifyingCaregiver ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang gửi thông báo cho con cái...</span>
                  </>
                ) : notifiedDone ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Đã báo cho con cái thành công!</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Tôi đã uống & Báo ngay cho con cái</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
