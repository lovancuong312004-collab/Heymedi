import { useState, useRef } from "react";
import { X, Camera, Scan, Check, Loader2, Trash2 } from "lucide-react";
import { analyzePrescription, type ParsedMedication } from "../utils/geminiVision";
import { addMedicationAndReminder } from "../services/medicationService";
import { useFamily } from "../contexts/FamilyContext";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanPrescriptionModal({ isOpen, onClose, onSuccess }: Props) {
  const { linkedPatientId } = useFamily();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [medsList, setMedsList] = useState<ParsedMedication[]>([]);
  const [step, setStep] = useState<"capture" | "review">("capture");

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      
      // Auto trigger scan
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
        alert("KhÃ´ng tÃ¬m tháº¥y thuá»‘c nÃ o trong áº£nh. Vui lÃ²ng chá»¥p láº¡i rÃµ rÃ ng hÆ¡n.");
        resetState();
      }
    } catch (err: any) {
      alert(err.message || "CÃ³ lá»—i xáº£y ra khi quÃ©t áº£nh");
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

  const updateMed = (index: number, field: keyof ParsedMedication, value: string) => {
    setMedsList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  const handleSaveAll = async () => {
    if (!linkedPatientId) return;
    try {
      setIsSaving(true);
      let imageUrl = null;

      // Upload original prescription image to keep reference
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

      // Process all medications
      for (const med of medsList) {
        let timeToSave = "08:00";
        const period = med.time.toLowerCase();
        if (period.includes("trÆ°a")) timeToSave = "12:00";
        else if (period.includes("tá»‘i")) timeToSave = "20:00";
        else if (period.includes("ngá»§")) timeToSave = "22:00";
        
        await addMedicationAndReminder(
          linkedPatientId,
          med.name,
          med.dosage,
          med.instructions,
          timeToSave,
          imageUrl
        );
      }
      
      alert(`ÄÃ£ lÆ°u thÃ nh cÃ´ng ${medsList.length} loáº¡i thuá»‘c!`);
      handleClose();
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("CÃ³ lá»—i xáº£y ra khi lÆ°u. Vui lÃ²ng thá»­ láº¡i.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-bold">
              <Scan size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A2B4B]">QuÃ©t ÄÆ¡n Thuá»‘c AI</h3>
              <p className="text-gray-400 text-xs">PhÃ¢n tÃ­ch báº±ng Gemini Vision</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isScanning || isSaving}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {step === "capture" ? (
            <div className="flex flex-col items-center justify-center py-10">
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              
              {isScanning ? (
                <div className="flex flex-col items-center justify-center text-primary gap-4">
                  <Loader2 size={48} className="animate-spin" />
                  <p className="font-bold">AI Ä‘ang phÃ¢n tÃ­ch Ä‘Æ¡n thuá»‘c...</p>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-4 bg-[#EBF1FF] text-primary border-2 border-dashed border-[#B3CCFF] rounded-[24px] p-10 hover:bg-[#E0EBFF] transition-all"
                >
                  <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center text-primary">
                    <Camera size={40} />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg block">Chá»¥p ÄÆ¡n Thuá»‘c</span>
                    <span className="text-sm opacity-80 mt-1 block">Hoáº·c táº£i áº£nh tá»« thÆ° viá»‡n</span>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-[#1A2B4B]">TÃ¬m tháº¥y {medsList.length} loáº¡i thuá»‘c</span>
                <button onClick={resetState} className="text-xs text-primary font-semibold">Chá»¥p láº¡i</button>
              </div>
              
              {medsList.map((med, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 relative group">
                  <button 
                    onClick={() => removeMed(idx)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-white text-danger border border-red-100 shadow-sm rounded-full flex items-center justify-center hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">TÃªn thuá»‘c</label>
                      <input 
                        value={med.name} 
                        onChange={(e) => updateMed(idx, 'name', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-[#1A2B4B] focus:border-primary outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Liá»u lÆ°á»£ng</label>
                        <input 
                          value={med.dosage} 
                          onChange={(e) => updateMed(idx, 'dosage', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-[#1A2B4B] focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Buá»•i uá»‘ng</label>
                        <input 
                          value={med.time} 
                          onChange={(e) => updateMed(idx, 'time', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-[#1A2B4B] focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">CÃ¡ch dÃ¹ng</label>
                      <input 
                        value={med.instructions} 
                        onChange={(e) => updateMed(idx, 'instructions', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-[#1A2B4B] focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="w-full bg-primary hover:bg-blue-700 disabled:opacity-70 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {isSaving ? "Äang lÆ°u táº¥t cáº£..." : "XÃ¡c nháº­n & LÆ°u táº¥t cáº£"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

