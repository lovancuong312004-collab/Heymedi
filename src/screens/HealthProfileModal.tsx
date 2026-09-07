import { useState } from "react";
import { 
  X, 
  Calendar, 
  Activity, 
  MapPin, 
  User as UserIcon, 
  Heart, 
  Plus, 
  Edit3, 
  Check, 
  Loader2,
  Phone,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdated?: () => void;
}

export default function HealthProfileModal({ isOpen, onClose, user, onUpdated }: Props) {
  const meta = user?.user_metadata || {};

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [height, setHeight] = useState<number | string>(meta.height || 165);
  const [weight, setWeight] = useState<number | string>(meta.weight || 62);
  const [bloodType, setBloodType] = useState<string>(meta.blood_type || "O");
  const [dob, setDob] = useState<string>(meta.dob || "1955-06-15");
  const [gender, setGender] = useState<string>(meta.gender || "Nam");
  const [address, setAddress] = useState<string>(meta.address || "Hà Nội, Việt Nam");
  const [emergencyPhone, setEmergencyPhone] = useState<string>(meta.emergency_phone || "0901 234 567");
  const [allergies, setAllergies] = useState<string>(meta.allergies || "Không có dị ứng thuốc");

  const [diseases, setDiseases] = useState<string[]>(
    meta.chronic_diseases && Array.isArray(meta.chronic_diseases)
      ? meta.chronic_diseases
      : ["Cao huyết áp", "Tiểu đường tuýp 2"]
  );
  const [newDiseaseInput, setNewDiseaseInput] = useState("");

  if (!isOpen) return null;

  // Auto calculate BMI
  const numHeight = Number(height);
  const numWeight = Number(weight);
  const bmiVal = (numHeight > 0 && numWeight > 0)
    ? (numWeight / Math.pow(numHeight / 100, 2)).toFixed(1)
    : "--";

  const numBmi = Number(bmiVal);
  let bmiCategory = "Bình thường";
  let bmiColor = "text-emerald-600 bg-emerald-50 border-emerald-200";

  if (!isNaN(numBmi)) {
    if (numBmi < 18.5) {
      bmiCategory = "Gầy (Thiếu cân)";
      bmiColor = "text-amber-600 bg-amber-50 border-amber-200";
    } else if (numBmi <= 24.9) {
      bmiCategory = "Chuẩn lý tưởng";
      bmiColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    } else if (numBmi <= 29.9) {
      bmiCategory = "Tiền béo phì (Thừa cân)";
      bmiColor = "text-orange-600 bg-orange-50 border-orange-200";
    } else {
      bmiCategory = "Béo phì (Cần chú ý)";
      bmiColor = "text-red-600 bg-red-50 border-red-200";
    }
  }

  const handleAddDisease = () => {
    if (newDiseaseInput.trim() && !diseases.includes(newDiseaseInput.trim())) {
      setDiseases(prev => [...prev, newDiseaseInput.trim()]);
      setNewDiseaseInput("");
    }
  };

  const handleRemoveDisease = (index: number) => {
    setDiseases(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const updateData = {
        height: Number(height),
        weight: Number(weight),
        blood_type: bloodType,
        dob,
        gender,
        address,
        emergency_phone: emergencyPhone,
        allergies,
        chronic_diseases: diseases
      };

      const { error } = await supabase.auth.updateUser({
        data: updateData
      });

      if (error) throw error;

      alert("Đã cập nhật hồ sơ sức khỏe thành công!");
      setIsEditing(false);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error("Save profile error:", err);
      alert(err.message || "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Bác");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full h-[90vh] sm:h-auto sm:max-h-[88vh] sm:max-w-lg bg-[#F4F7FB] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF1FF] text-primary flex items-center justify-center font-bold">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A2B4B]">Hồ sơ sức khỏe</h2>
              <p className="text-xs text-gray-400">Thông tin sinh trắc & bệnh lý nền</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 bg-[#EBF1FF] text-primary hover:bg-blue-100 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all"
              >
                <Edit3 size={14} /> Chỉnh sửa
              </button>
            ) : (
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
              </button>
            )}

            <button 
              onClick={onClose} 
              className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Patient Card */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-black text-xl border-2 border-white shadow-sm shrink-0">
              {meta.avatar_url ? (
                <img src={meta.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                fullName[0]?.toUpperCase() || "B"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[#1a2b4b] font-black text-lg truncate">Bác {fullName.replace(/^bác\s+/i, '')}</h3>
              <p className="text-gray-500 text-xs font-medium">Bệnh nhân cao tuổi</p>
            </div>
          </div>

          {/* Body Metrics & BMI */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-extrabold text-sm text-[#1A2B4B] flex items-center gap-1.5">
                <Heart size={16} className="text-rose-500" /> Chỉ số thể chất & BMI
              </h4>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-lg border", bmiColor)}>
                {bmiCategory}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Height */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">Chiều cao</label>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-16 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#1A2B4B] outline-none"
                    />
                    <span className="text-xs font-bold text-gray-500">cm</span>
                  </div>
                ) : (
                  <p className="text-lg font-black text-[#1A2B4B] mt-1">{height} cm</p>
                )}
              </div>

              {/* Weight */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">Cân nặng</label>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-16 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#1A2B4B] outline-none"
                    />
                    <span className="text-xs font-bold text-gray-500">kg</span>
                  </div>
                ) : (
                  <p className="text-lg font-black text-[#1A2B4B] mt-1">{weight} kg</p>
                )}
              </div>

              {/* Auto BMI */}
              <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-100">
                <label className="text-[10px] font-bold text-primary block uppercase">BMI tự tính</label>
                <p className="text-xl font-black text-primary mt-1">{bmiVal}</p>
              </div>

              {/* Blood type */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">Nhóm máu</label>
                {isEditing ? (
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#1A2B4B] outline-none mt-1"
                  >
                    <option value="A">Nhóm A</option>
                    <option value="B">Nhóm B</option>
                    <option value="AB">Nhóm AB</option>
                    <option value="O">Nhóm O</option>
                  </select>
                ) : (
                  <p className="text-lg font-black text-[#1A2B4B] mt-1">Nhóm {bloodType}</p>
                )}
              </div>
            </div>
          </div>

          {/* Chronic Medical Conditions */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h4 className="font-extrabold text-sm text-danger flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Activity size={16} /> Tiền sử bệnh nền (Dùng để AI kiểm tra tương tác thuốc)
            </h4>

            <div className="flex flex-wrap gap-2 pt-1">
              {diseases.map((d, idx) => (
                <div 
                  key={idx} 
                  className="px-3 py-1.5 bg-red-50 text-danger border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <span>{d}</span>
                  {isEditing && (
                    <button onClick={() => handleRemoveDisease(idx)} className="hover:text-red-800 cursor-pointer">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isEditing && (
              <div className="pt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tên bệnh nền (VD: Tim mạch, Gout...)"
                  value={newDiseaseInput}
                  onChange={(e) => setNewDiseaseInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDisease()}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                />
                <button
                  onClick={handleAddDisease}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-blue-700 cursor-pointer"
                >
                  <Plus size={14} /> Thêm
                </button>
              </div>
            )}
          </div>

          {/* Personal & Emergency Info */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h4 className="font-extrabold text-sm text-[#1A2B4B] flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <UserIcon size={16} className="text-gray-500" /> Thông tin cá nhân & Liên hệ
            </h4>

            <div className="space-y-3 pt-1 text-xs">
              {/* DOB */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Calendar size={15} /> Ngày sinh:
                </span>
                {isEditing ? (
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none"
                  />
                ) : (
                  <span className="font-bold text-[#1A2B4B]">{dob ? new Date(dob).toLocaleDateString("vi-VN") : "Chưa rõ"}</span>
                )}
              </div>

              {/* Gender */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <UserIcon size={15} /> Giới tính:
                </span>
                {isEditing ? (
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                ) : (
                  <span className="font-bold text-[#1A2B4B]">{gender}</span>
                )}
              </div>

              {/* Address */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <MapPin size={15} /> Nơi ở:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none max-w-[200px]"
                  />
                ) : (
                  <span className="font-bold text-[#1A2B4B] truncate max-w-[200px]">{address}</span>
                )}
              </div>

              {/* Emergency Phone */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Phone size={15} /> SĐT người thân SOS:
                </span>
                {isEditing ? (
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none max-w-[150px]"
                  />
                ) : (
                  <span className="font-bold text-danger">{emergencyPhone}</span>
                )}
              </div>

              {/* Allergies */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <AlertCircle size={15} className="text-amber-500" /> Dị ứng:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1A2B4B] outline-none max-w-[200px]"
                  />
                ) : (
                  <span className="font-bold text-gray-700">{allergies}</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Save Button (if editing) */}
          {isEditing && (
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>LƯU HỒ SƠ SỨC KHỎE</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
