import { useState } from "react";
import { ArrowLeft, User, Phone, Lock, Eye, EyeOff, ChevronRight, UserCheck, Loader2, Calendar, Activity, MapPin } from "lucide-react";
import { supabase } from '../lib/supabase';

interface Props {
  onDone: (role: "elderly" | "caregiver") => void;
  onBack: () => void;
}

type Step = "info" | "profile" | "role";

export default function RegisterScreen({ onDone, onBack }: Props) {
  const [step, setStep] = useState<Step>("info");
  
  // Thông tin cơ bản
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Thông tin hồ sơ (Mới)
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Nam");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [address, setAddress] = useState("");

  const [selectedRole, setSelectedRole] = useState<"elderly" | "caregiver" | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleInfoNext = () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) return;
    setStep("profile");
  };

  const handleProfileNext = () => {
    setStep("role");
  };

  const handleRoleSelect = (role: "elderly" | "caregiver") => {
    setSelectedRole(role);
  };

  const handleDone = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    setErrorMsg("");
    
    try {
      const roleStr = selectedRole === "elderly" ? "ELDERLY" : "CAREGIVER";
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name,
            role: roleStr,
            phone: phone.trim(),
            dob: dob,
            gender: gender,
            weight: weight,
            height: height,
            address: address
          }
        }
      });

      if (signUpError) {
        setErrorMsg(signUpError.message);
        setLoading(false);
        return;
      }

      // Lưu vào public.profiles để tra cứu khi đăng nhập bằng SĐT
      supabase.from('profiles').insert({
        id: signUpData.user?.id,
        phone: phone.trim(),
        email: email.trim(),
        full_name: name
      }).then(({ error: dbError }) => {
        if (dbError) console.error("Lỗi khi lưu DB (Bảng profiles có thể chưa tạo):", dbError);
      });

      onDone(selectedRole);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra');
    }
    
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 gap-3">
        <button 
          onClick={() => {
            if (step === "role") setStep("profile");
            else if (step === "profile") setStep("info");
            else onBack();
          }} 
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1A2B4B]">
            {step === "info" ? "Tạo tài khoản" : step === "profile" ? "Hồ sơ cá nhân" : "Chọn vai trò"}
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Bước {step === "info" ? "1" : step === "profile" ? "2" : "3"} / 3
          </p>
        </div>

        {/* Progress bar */}
        <div className="ml-auto flex gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-primary" />
          <div className={`w-6 h-1.5 rounded-full transition-colors ${step === "profile" || step === "role" ? "bg-primary" : "bg-gray-200"}`} />
          <div className={`w-6 h-1.5 rounded-full transition-colors ${step === "role" ? "bg-primary" : "bg-gray-200"}`} />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 pb-8">
        {/* Step 1: Info */}
        {step === "info" && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-500 text-sm mb-2">Điền thông tin đăng nhập</p>

            {/* Name */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1.5 block">Họ và tên</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                <User size={20} className="text-gray-400 shrink-0" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1.5 block">Email (Dùng để lấy lại mật khẩu)</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                <User size={20} className="text-gray-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="VD: nguyenvana@gmail.com"
                  className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1.5 block">Số điện thoại</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                <Phone size={20} className="text-gray-400 shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                  className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1.5 block">Mật khẩu</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                <Lock size={20} className="text-gray-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tạo mật khẩu..."
                  className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleInfoNext}
              disabled={!name.trim() || !phone.trim() || !password.trim()}
              className="mt-4 w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
            >
              Tiếp theo <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Profile */}
        {step === "profile" && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-500 text-sm mb-2">Thông tin này giúp theo dõi sức khỏe tốt hơn</p>

            {/* DOB & Gender */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-600 mb-1.5 block">Ngày sinh</label>
                <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                  <Calendar size={20} className="text-gray-400 shrink-0" />
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none"
                  />
                </div>
              </div>
              <div className="w-[120px]">
                <label className="text-sm font-bold text-gray-600 mb-1.5 block">Giới tính</label>
                <div className="flex items-center border-2 border-gray-200 rounded-2xl px-3 py-3.5 gap-2 focus-within:border-primary transition-colors bg-gray-50/50">
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none appearance-none"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Weight & Height */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-600 mb-1.5 block">Chiều cao (cm)</label>
                <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                  <Activity size={20} className="text-gray-400 shrink-0" />
                  <input
                    type="number"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="VD: 165"
                    className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-600 mb-1.5 block">Cân nặng (kg)</label>
                <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                  <Activity size={20} className="text-gray-400 shrink-0" />
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="VD: 60"
                    className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1.5 block">Địa chỉ</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary transition-colors bg-gray-50/50">
                <MapPin size={20} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Nhập địa chỉ của bạn..."
                  className="flex-1 bg-transparent text-[#1A2B4B] font-semibold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            <button
              onClick={handleProfileNext}
              className="mt-4 w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              Tiếp theo <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 3: Role Selection */}
        {step === "role" && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-500 text-sm mb-2">Bạn sẽ sử dụng ứng dụng với vai trò nào?</p>

            {/* Elderly Role Card */}
            <button
              onClick={() => handleRoleSelect("elderly")}
              className={`w-full text-left p-5 rounded-3xl border-2 transition-all active:scale-[0.98] ${
                selectedRole === "elderly"
                  ? "border-primary bg-blue-50 shadow-md shadow-primary/15"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
                  selectedRole === "elderly" ? "bg-blue-100" : "bg-gray-100"
                }`}>
                  🧓
                </div>
                <div className="flex-1">
                  <h3 className={`font-extrabold text-lg leading-tight mb-1 ${selectedRole === "elderly" ? "text-primary" : "text-[#1A2B4B]"}`}>
                    Tôi là người dùng thuốc
                  </h3>
                  <p className="text-gray-500 text-xs font-medium leading-relaxed">
                    Giao diện đơn giản, chữ to dễ đọc. Nhắc uống thuốc, SOS khẩn cấp, quét thuốc AI.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["📅 Lịch thuốc", "🔔 Nhắc nhở", "🆘 SOS", "📷 Quét AI"].map(tag => (
                      <span key={tag} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedRole === "elderly" ? "bg-blue-100 text-primary" : "bg-gray-100 text-gray-600"
                      }`}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${
                  selectedRole === "elderly" ? "border-primary bg-primary" : "border-gray-300"
                }`}>
                  {selectedRole === "elderly" && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            </button>

            {/* Caregiver Role Card */}
            <button
              onClick={() => handleRoleSelect("caregiver")}
              className={`w-full text-left p-5 rounded-3xl border-2 transition-all active:scale-[0.98] ${
                selectedRole === "caregiver"
                  ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
                  selectedRole === "caregiver" ? "bg-emerald-100" : "bg-gray-100"
                }`}>
                  👨‍👩‍👦
                </div>
                <div className="flex-1">
                  <h3 className={`font-extrabold text-lg leading-tight mb-1 ${selectedRole === "caregiver" ? "text-emerald-700" : "text-[#1A2B4B]"}`}>
                    Tôi là người chăm sóc
                  </h3>
                  <p className="text-gray-500 text-xs font-medium leading-relaxed">
                    Quản lý toàn diện, giám sát từ xa, báo cáo AI, gọi điện nhắc thuốc ngay.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["📊 Báo cáo AI", "📞 Gọi nhắc", "🔍 Giám sát", "📝 Quản lý"].map(tag => (
                      <span key={tag} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedRole === "caregiver" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${
                  selectedRole === "caregiver" ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                }`}>
                  {selectedRole === "caregiver" && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            </button>

            {errorMsg && (
              <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm font-semibold">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleDone}
              disabled={!selectedRole || loading}
              className={`mt-2 w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 shadow-lg ${
                selectedRole === "caregiver"
                  ? "bg-emerald-500 text-white shadow-emerald-200"
                  : "bg-primary text-white shadow-primary/25"
              }`}
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : <UserCheck size={22} />}
              {loading ? "Đang xử lý..." : "Bắt đầu sử dụng"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
