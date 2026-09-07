import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  SwitchCamera, 
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Loader2
} from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  guideText?: string;
  onCaptureComplete: (blob: Blob, previewUrl: string) => void | Promise<void>;
}

export default function ElderlyCameraCaptureModal({
  isOpen,
  onClose,
  title = "Chụp Ảnh Vỉ Thuốc Minh Chứng",
  subtitle = "Gửi hình ảnh thuốc đã uống cho người nhà yên tâm",
  guideText = "ĐẶT VỈ THUỐC HOẶC THUỐC TRÊN TAY VÀO GIỮA KHUNG HÌNH",
  onCaptureComplete
}: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileFallbackInputRef = useRef<HTMLInputElement>(null);

  // Khởi động Camera luồng video trực tiếp
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Không thể truy cập camera qua getUserMedia:", err);
      setCameraError("Thiết bị không mở được camera hoặc chưa cấp quyền. Bác có thể bấm chọn ảnh có sẵn bên dưới ạ.");
    }
  }, [stream]);

  // Dừng luồng Camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Đổi camera trước / sau
  const handleToggleFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Bấm nút chụp ảnh từ luồng video
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Hiệu ứng chớp sáng màn hình
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Nếu camera trước, lật ngang ảnh cho tự nhiên
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedImage(url);
        setCapturedBlob(blob);
      }
    }, "image/jpeg", 0.9);
  };

  // Người dùng chọn file có sẵn từ máy (fallback)
  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCapturedImage(url);
      setCapturedBlob(file);
    }
  };

  // Chụp lại
  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  // Xác nhận ảnh chụp gửi đi
  const handleConfirm = async () => {
    if (!capturedBlob || !capturedImage) return;
    try {
      setIsProcessing(true);
      await onCaptureComplete(capturedBlob, capturedImage);
      stopCamera();
      onClose();
    } catch (err) {
      console.error("Xác nhận ảnh thất bại:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-gray-900 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] relative border border-white/10">
        
        {/* Flash Effect */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/90 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Camera size={22} />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white leading-tight">{title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Frame / Captured Preview */}
        <div className="relative flex-1 bg-black min-h-[340px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            /* Ảnh đã chụp - Màn hình xem lại */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img 
                src={capturedImage} 
                alt="Ảnh vừa chụp" 
                className="w-full h-full max-h-[500px] object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                <Sparkles size={14} />
                <span>Ảnh đã chụp rõ nét</span>
              </div>
            </div>
          ) : cameraError ? (
            /* Lỗi camera hoặc không có webcam */
            <div className="p-6 text-center flex flex-col items-center justify-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm text-gray-300 font-semibold mb-4 leading-relaxed">
                {cameraError}
              </p>
              <button
                onClick={() => fileFallbackInputRef.current?.click()}
                className="w-full bg-primary hover:bg-blue-600 text-white py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <ImageIcon size={18} />
                <span>CHỌN ẢNH TỪ MÁY / THƯ VIỆN</span>
              </button>
            </div>
          ) : (
            /* Live Camera Feed */
            <div className="relative w-full h-full flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={cn(
                  "w-full h-full object-cover min-h-[340px]",
                  facingMode === "user" && "scale-x-[-1]"
                )}
              />

              {/* Khung ngắm định vị trực quan */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-[82%] max-w-[320px] aspect-[4/3] rounded-3xl border-3 border-dashed border-emerald-400/90 shadow-[0_0_25px_rgba(52,211,153,0.35)] relative flex items-center justify-center">
                  <span className="text-[11px] font-black uppercase tracking-wider text-white bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-full border border-emerald-400/40 text-center mx-2">
                    {guideText}
                  </span>
                </div>
              </div>

              {/* Nút đổi Camera góc trên */}
              <button
                type="button"
                onClick={handleToggleFacing}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white p-2.5 rounded-2xl border border-white/20 active:scale-90 transition-all cursor-pointer z-10"
                title="Đổi camera trước / sau"
              >
                <SwitchCamera size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Input file fallback ẩn */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileFallbackInputRef} 
          onChange={handleFileFallback} 
          className="hidden" 
        />

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-900 border-t border-white/10 shrink-0 space-y-3">
          {capturedImage ? (
            /* Nút hành động sau khi đã chụp: Chụp lại vs Xác nhận gửi */
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isProcessing}
                className="py-4 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm flex items-center justify-center gap-2 border border-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={18} />
                <span>CHỤP LẠI</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={20} strokeWidth={3} />
                )}
                <span>XÁC NHẬN GỬI CHO CON</span>
              </button>
            </div>
          ) : !cameraError ? (
            /* Nút bấm chụp to tròn cho người già */
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-full">
                <button
                  type="button"
                  onClick={handleSnap}
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white p-1.5 shadow-2xl active:scale-90 transition-transform cursor-pointer flex items-center justify-center ring-4 ring-emerald-400 ring-offset-4 ring-offset-gray-900 group"
                  title="Bấm để chụp ảnh"
                >
                  <div className="w-full h-full rounded-full bg-emerald-500 group-hover:bg-emerald-600 flex items-center justify-center text-white transition-colors">
                    <Camera size={34} strokeWidth={2.5} />
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between w-full pt-1">
                <button
                  type="button"
                  onClick={() => fileFallbackInputRef.current?.click()}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon size={14} />
                  <span>Hoặc chọn ảnh có sẵn từ máy</span>
                </button>

                <span className="text-[11px] text-gray-400 font-semibold">
                  📸 Chạm vào nút tròn để chụp
                </span>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
