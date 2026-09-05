import { useState } from "react";
import { Camera, X, Sparkles, CheckCircle2, RefreshCw, Upload, ShieldCheck } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddMedSuccess?: (newMed: any) => void;
}

export default function ScanAIModal({ isOpen, onClose, onAddMedSuccess }: Props) {
  const [scanStep, setScanStep] = useState<"camera" | "processing" | "result">("camera");
  const [sampleMedIndex, setSampleMedIndex] = useState(0);

  const sampleMeds = [
    {
      name: "Metformin 500mg",
      activeIngredient: "Metformin Hydrochloride",
      dosage: "1 viên (500mg)",
      timing: "Sau ăn trưa (12:00)",
      period: "Trưa",
      expiryDate: "12/2027",
      confidence: "98.5%",
      warning: "Không uống khi bụng đói. Cần uống cùng nhiều nước."
    },
    {
      name: "Amlodipine 5mg",
      activeIngredient: "Amlodipine Besylate",
      dosage: "1 viên (5mg)",
      timing: "Sau ăn sáng (08:00)",
      period: "Sáng",
      expiryDate: "06/2028",
      confidence: "99.2%",
      warning: "Duy trì uống đều đặn mỗi sáng để ổn định huyết áp."
    },
    {
      name: "Glucosamine 1500mg",
      activeIngredient: "Glucosamine Sulfate",
      dosage: "1 viên",
      timing: "Sau ăn sáng (08:00)",
      period: "Sáng",
      expiryDate: "09/2027",
      confidence: "97.8%",
      warning: "Hỗ trợ khớp cho người cao tuổi."
    }
  ];

  if (!isOpen) return null;

  const currentMed = sampleMeds[sampleMedIndex];

  const handleCapture = () => {
    setScanStep("processing");
    setTimeout(() => {
      setScanStep("result");
    }, 1800);
  };

  const handleConfirmAdd = () => {
    if (onAddMedSuccess) {
      onAddMedSuccess({
        id: String(Date.now()),
        name: currentMed.name,
        dosage: currentMed.dosage,
        instruction: currentMed.timing,
        time: currentMed.period === "Sáng" ? "08:00" : currentMed.period === "Trưa" ? "12:00" : "20:00",
        period: currentMed.period,
        status: "future"
      });
    }
    setScanStep("camera");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A2B4B]">Quét thuốc AI Vision</h3>
              <p className="text-gray-400 text-xs">Nhận diện thông minh hộp & vỉ thuốc</p>
            </div>
          </div>
          <button
            onClick={() => {
              setScanStep("camera");
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* STEP 1: CAMERA SCAN */}
          {scanStep === "camera" && (
            <div className="flex flex-col items-center">
              {/* Viewfinder */}
              <div className="w-full h-64 bg-slate-900 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center shadow-inner border-2 border-emerald-500/40">
                {/* Camera mock image */}
                <img
                  src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop"
                  alt="Medicine Scanner"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />

                {/* Laser scan line effect */}
                <div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10B981]"
                  style={{
                    animation: "scanBeam 2.5s ease-in-out infinite"
                  }}
                />

                {/* Frame Corner Markers */}
                <div className="absolute top-4 left-4 w-7 h-7 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

                {/* Guide Text */}
                <div className="absolute bottom-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-[11px] font-medium border border-white/10">
                  Đặt hộp thuốc hoặc vỉ thuốc vào khung hình
                </div>
              </div>

              {/* Sample Switcher (for demo realism) */}
              <div className="w-full mt-4 flex items-center justify-between px-2 text-xs text-gray-500">
                <span>Mẫu thuốc thử nghiệm:</span>
                <button
                  onClick={() => setSampleMedIndex((prev) => (prev + 1) % sampleMeds.length)}
                  className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Đổi mẫu: {currentMed.name}
                </button>
              </div>

              {/* Capture Action */}
              <div className="w-full mt-6 flex gap-3">
                <button
                  onClick={handleCapture}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Camera size={22} />
                  Chụp & Phân tích AI
                </button>
                <button
                  onClick={handleCapture}
                  className="px-4 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold flex items-center justify-center transition-all"
                  title="Tải ảnh từ thư viện"
                >
                  <Upload size={20} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {scanStep === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
              </div>

              <h4 className="text-xl font-bold text-[#1A2B4B] mb-2">AI Vision đang đọc thuốc...</h4>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                Đang nhận diện nhãn hiệu, thành phần hoạt chất và đề xuất liều uống an toàn cho người cao tuổi.
              </p>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {scanStep === "result" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>Độ tin cậy AI: {currentMed.confidence}</span>
                </div>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded-full font-bold text-emerald-700 border border-emerald-200">
                  Đã kiểm tra an toàn
                </span>
              </div>

              {/* Medicine Card Detail */}
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                <div>
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tên thuốc</span>
                  <h4 className="text-xl font-black text-[#1A2B4B]">{currentMed.name}</h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-medium">Hoạt chất chính</span>
                    <span className="font-bold text-[#1A2B4B]">{currentMed.activeIngredient}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-medium">Hạn sử dụng</span>
                    <span className="font-bold text-[#1A2B4B]">{currentMed.expiryDate}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block font-medium">Liều dùng khuyến nghị</span>
                  <p className="font-bold text-emerald-700 text-sm mt-0.5">{currentMed.dosage} • {currentMed.timing}</p>
                </div>

                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                  ⚠️ <b>Lưu ý AI:</b> {currentMed.warning}
                </div>
              </div>

              {/* Confirm Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setScanStep("camera")}
                  className="px-4 py-3.5 rounded-2xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50"
                >
                  Quét lại
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25"
                >
                  <CheckCircle2 size={18} />
                  Thêm vào đơn của Ông Minh
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes scanBeam {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
