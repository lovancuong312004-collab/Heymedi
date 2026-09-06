import { useState } from "react";
import { X, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg("");
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in bg-black/40 backdrop-blur-sm">
      <div className="w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#1A2B4B]">Quên mật khẩu</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-success" />
            </div>
            <h3 className="text-xl font-bold text-[#1A2B4B] mb-2">Đã gửi liên kết!</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Chúng tôi đã gửi một liên kết khôi phục mật khẩu đến email <b>{email}</b>. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).
            </p>
            <button 
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold"
            >
              Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <div className="flex-1 p-6 flex flex-col">
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Vui lòng nhập địa chỉ Email mà bạn đã đăng ký. Chúng tôi sẽ gửi một liên kết để bạn đặt lại mật khẩu mới.
            </p>

            <div className="mb-6">
              <label className="text-sm font-bold text-gray-600 mb-1.5 block">Email đăng ký</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                <Mail size={20} className="text-gray-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="VD: nguyenvana@gmail.com"
                  className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-danger text-sm font-bold rounded-xl border border-red-100 text-center">
                {errorMsg}
              </div>
            )}

            <button 
              onClick={handleReset}
              disabled={!email.trim() || loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-auto sm:mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Gửi liên kết khôi phục"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
