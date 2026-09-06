import { useState } from "react";
import { Phone, Eye, EyeOff, Lock, ArrowRight, UserPlus } from "lucide-react";
import { supabase } from '../lib/supabase';
import ForgotPasswordModal from "./ForgotPasswordModal";

interface Props {
  onLogin: (role: "elderly" | "caregiver") => void;
  onRegister: () => void;
}

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const inputVal = phone.trim();
      const isEmail = inputVal.includes('@');
      let authEmail = inputVal;
      
      // Nếu không phải email, giả định là số điện thoại và gọi RPC lấy email tương ứng
      if (!isEmail) {
        const { data: emailFromDb, error: rpcError } = await supabase
          .rpc('get_email_by_phone', { p_phone: inputVal });
          
        if (rpcError || !emailFromDb) {
          setError('Không tìm thấy tài khoản với số điện thoại này.');
          setLoading(false);
          return;
        }
        authEmail = emailFromDb;
      }
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: password
      });

      if (signInError) {
        if (signInError.message === 'Email not confirmed') {
          setError('Lỗi: Bạn chưa tắt tính năng Xác nhận Email trên Supabase!');
        } else if (signInError.message === 'Invalid login credentials') {
          setError('Sai thông tin đăng nhập.');
        } else {
          setError(`Lỗi từ Supabase: ${signInError.message}`);
        }
        setLoading(false);
        return;
      }

      // Đăng nhập thành công, fetch role từ user_metadata
      const role = data.user?.user_metadata?.role;
      onLogin(role === 'ELDERLY' ? 'elderly' : 'caregiver');

    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white relative overflow-x-hidden">
      
      {/* Top Section (Video Banner) */}
      <div className="w-full relative z-10 bg-white flex justify-center">
         <video 
           src="/Video%20Project%201.mp4"
           autoPlay
           loop
           muted
           playsInline
           className="w-[125%] max-w-[125%] flex-shrink-0 h-auto block" 
         />
      </div>

      {/* Bottom Card Form (Seamless with white background) */}
      <div className="flex-1 bg-white w-full px-7 pt-5 pb-6 flex flex-col relative z-20">
        <h2 className="text-[28px] font-black text-[#1A2B4B] mb-1 tracking-tight">Đăng nhập</h2>
        <p className="text-gray-500 text-[15px] mb-8 font-medium">Chào mừng bạn trở lại HeyMedi!</p>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Identifier */}
        <div className="mb-5">
          <label className="text-[15px] font-bold text-[#1A2B4B] mb-2 block">Email hoặc Số điện thoại</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3.5 gap-3 focus-within:border-[#2166F3] focus-within:ring-2 focus-within:ring-[#2166F3]/20 transition-all bg-[#FCFDFE]">
            <Phone size={20} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Nhập Email hoặc SĐT..."
              className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-[15px] outline-none placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-3">
          <label className="text-[15px] font-bold text-[#1A2B4B] mb-2 block">Mật khẩu</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3.5 gap-3 focus-within:border-[#2166F3] focus-within:ring-2 focus-within:ring-[#2166F3]/20 transition-all bg-[#FCFDFE]">
            <Lock size={20} className="text-gray-400 shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-[15px] outline-none placeholder:text-gray-400 placeholder:font-normal"
            />
            <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => setIsForgotOpen(true)}
            className="text-[#1A56DB] text-[15px] font-bold"
          >
            Quên mật khẩu?
          </button>
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#2166F3] hover:bg-[#1A56DB] disabled:bg-gray-400 text-white py-[18px] rounded-xl font-bold text-[17px] shadow-lg shadow-[#2166F3]/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          {!loading && <ArrowRight size={20} />}
        </button>

        <ForgotPasswordModal 
          isOpen={isForgotOpen} 
          onClose={() => setIsForgotOpen(false)} 
        />

        {/* Divider Social */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-[1px] bg-gray-200" />
          <span className="text-gray-400 text-sm font-semibold">hoặc đăng nhập với</span>
          <div className="flex-1 h-[1px] bg-gray-200" />
        </div>

        {/* Social Buttons */}
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => handleOAuth('google')} className="flex-1 flex items-center justify-center gap-2.5 py-3.5 border border-gray-200 rounded-[14px] hover:bg-gray-50 active:scale-95 transition-all bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            <span className="text-[#1A2B4B] font-bold text-sm">Google</span>
          </button>
          
          <button onClick={() => handleOAuth('facebook')} className="flex-1 flex items-center justify-center gap-2.5 py-3.5 border border-gray-200 rounded-[14px] hover:bg-gray-50 active:scale-95 transition-all bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span className="text-[#1A2B4B] font-bold text-sm">Facebook</span>
          </button>

          <button onClick={() => handleOAuth('apple')} className="flex-1 flex items-center justify-center gap-2.5 py-3.5 border border-gray-200 rounded-[14px] hover:bg-gray-50 active:scale-95 transition-all bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="#000000"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.62-1.48 3.608-2.926 1.151-1.688 1.624-3.328 1.65-3.414-.035-.015-3.197-1.222-3.23-4.887-.026-3.076 2.505-4.549 2.62-4.622-1.442-2.106-3.677-2.39-4.48-2.428-1.942-.158-3.864 1.214-4.445 1.214zm4.22-3.132c.813-.984 1.36-2.35 1.211-3.712-1.164.047-2.6.776-3.44 1.761-.75.834-1.378 2.222-1.198 3.565 1.306.101 2.607-.635 3.427-1.614z"/></svg>
            <span className="text-[#1A2B4B] font-bold text-sm">Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-500 text-[13px] font-semibold">Chưa có tài khoản?</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Register */}
        <button
          onClick={onRegister}
          className="w-full bg-white border border-[#2166F3] text-[#2166F3] py-[16px] rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-[#F4F8FF] mt-6"
        >
          <UserPlus size={20} />
          Tạo tài khoản mới
        </button>

        {/* Footer */}
        <div className="mt-auto pt-6 pb-2 text-center">
          <p className="text-gray-400 text-xs font-medium">
            HeyMedi <span className="mx-1">|</span> Đồng hành cùng sức khỏe Việt 💙
          </p>
        </div>
      </div>
    </div>
  );
}
