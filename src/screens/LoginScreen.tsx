import { useState } from "react";
import { Eye, EyeOff, Phone, Lock, ArrowRight, Pill, ClipboardList, Users, UserPlus, ChevronRight, Plus, Heart } from "lucide-react";

interface Props {
  onLogin: (role: "elderly" | "caregiver") => void;
  onRegister: () => void;
}

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!phone.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setError("");
    // Demo: phone bắt đầu bằng "0901" → elderly, còn lại → caregiver
    if (phone.startsWith("0901")) {
      onLogin("elderly");
    } else {
      onLogin("caregiver");
    }
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

        {/* Phone */}
        <div className="mb-5">
          <label className="text-[15px] font-bold text-[#1A2B4B] mb-2 block">Số điện thoại</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3.5 gap-3 focus-within:border-[#2166F3] focus-within:ring-2 focus-within:ring-[#2166F3]/20 transition-all bg-[#FCFDFE]">
            <Phone size={20} className="text-gray-400 shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại..."
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
          <button className="text-[#1A56DB] text-[15px] font-bold">Quên mật khẩu?</button>
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="w-full bg-[#2166F3] hover:bg-[#1A56DB] text-white py-[18px] rounded-xl font-bold text-[17px] shadow-lg shadow-[#2166F3]/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          Đăng nhập
          <ArrowRight size={20} />
        </button>

        {/* Demo hint box */}
        <div className="mt-5 bg-[#F4F8FF] rounded-xl px-4 py-3 border border-[#DCE8FF] flex items-center gap-3 cursor-pointer">
          <span className="text-xl">💡</span>
          <p className="text-[#3267D6] text-[11px] font-medium leading-relaxed flex-1">
            Demo: Nhập SĐT bắt đầu <b>0901...</b> — Giao diện người già | SĐT khác – Người chăm sóc
          </p>
          <ChevronRight size={16} className="text-[#3267D6]" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-500 text-[13px] font-semibold">Chưa có tài khoản?</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Register */}
        <button
          onClick={onRegister}
          className="w-full bg-white border border-[#2166F3] text-[#2166F3] py-[16px] rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-[#F4F8FF]"
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
