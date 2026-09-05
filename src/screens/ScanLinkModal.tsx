import { useState, useEffect } from "react";
import { X, QrCode, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLinkSuccess: (patientName: string) => void;
  user: any; // The caregiver user
}

export default function ScanLinkModal({ isOpen, onClose, onLinkSuccess, user }: Props) {
  const [tab, setTab] = useState<"qr" | "code">("qr");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTab("qr");
      setCode("");
      setSuccess(false);
      setErrorMsg("");
      return;
    }

    if (tab === "qr") {
      let scanner: Html5QrcodeScanner;
      
      const initScanner = setTimeout(() => {
        scanner = new Html5QrcodeScanner("qr-reader", {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        }, false);

        scanner.render(
          (decodedText) => {
            scanner.clear();
            let extractedCode = decodedText;
            if (decodedText.includes("heymedi://link?code=")) {
              extractedCode = decodedText.split("code=")[1];
            }
            setCode(extractedCode);
            handleLink(extractedCode);
          },
          () => {
            // ignore scan errors
          }
        );
      }, 100);

      return () => {
        clearTimeout(initScanner);
        if (scanner) {
          scanner.clear().catch(e => console.error(e));
        }
      };
    }
  }, [isOpen, tab]);

  const handleLink = async (codeToUse?: string) => {
    const finalCode = (codeToUse || code).toUpperCase();
    if (finalCode.length !== 6) return;
    
    setLoading(true);
    setErrorMsg("");
    
    // 1. Verify code exists in `link_codes`
    const { data: codes, error: codeErr } = await supabase
      .from('link_codes')
      .select('*')
      .eq('code', finalCode);

    if (codeErr || !codes || codes.length === 0) {
      setErrorMsg("Mã kết nối không hợp lệ hoặc đã hết hạn.");
      setLoading(false);
      return;
    }

    const patientLink = codes[0];

    if (new Date(patientLink.expires_at) < new Date()) {
      setErrorMsg("Mã kết nối đã hết hạn.");
      setLoading(false);
      return;
    }

    // 2. Insert into `family_links`
    const { error: linkErr } = await supabase
      .from('family_links')
      .insert([
        {
          patient_id: patientLink.patient_id,
          caregiver_id: user.id
        }
      ]);

    if (linkErr) {
      if (linkErr.code === '23505') { // unique violation
        setErrorMsg("Bạn đã liên kết với tài khoản này rồi!");
      } else {
        setErrorMsg("Lỗi khi liên kết: " + linkErr.message);
      }
      setLoading(false);
      return;
    }

    // 3. Delete the code so it can't be used again
    await supabase.from('link_codes').delete().eq('code', finalCode);

    setLoading(false);
    setSuccess(true);
    
    setTimeout(() => {
      onLinkSuccess(patientLink.patient_name);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in bg-black/40 backdrop-blur-sm">
      <div className="w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#1A2B4B]">Thêm người bệnh</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-success" />
            </div>
            <h3 className="text-xl font-bold text-[#1A2B4B] mb-2 text-center">Liên kết thành công!</h3>
            <p className="text-gray-500 text-center text-sm">Bạn đã có thể theo dõi và quản lý lịch thuốc của người bệnh.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 shrink-0">
              <button 
                onClick={() => setTab("qr")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  tab === "qr" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <QrCode size={18} /> Quét mã QR
              </button>
              <button 
                onClick={() => setTab("code")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  tab === "code" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Smartphone size={18} /> Nhập mã
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-danger text-sm font-bold rounded-xl border border-red-100 text-center">
                {errorMsg}
              </div>
            )}

            {tab === "qr" ? (
              <div className="flex-1 flex flex-col items-center animate-fade-in">
                <p className="text-gray-500 text-sm text-center px-4 font-medium leading-relaxed mb-4">
                  Đưa camera quét mã QR trên màn hình ứng dụng của người bệnh.
                </p>
                <div id="qr-reader" className="w-full max-w-[300px] overflow-hidden rounded-3xl border-2 border-gray-200"></div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-fade-in">
                <p className="text-gray-500 text-sm mb-4 text-center">
                  Nhập mã số liên kết gồm 6 ký tự hiển thị trên điện thoại của người bệnh.
                </p>
                
                <input 
                  type="text" 
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="------"
                  className="w-full text-center text-4xl font-black tracking-[0.4em] text-[#1A2B4B] bg-gray-50 border-2 border-gray-200 rounded-2xl py-6 mb-6 outline-none focus:border-primary focus:bg-white transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-300"
                />
                
                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => handleLink()}
                    disabled={code.length !== 6 || loading}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Xác nhận liên kết"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
