import { useState } from "react";
import { X, Plus, Clock, Pill, FileText, Check } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (med: any) => void;
}

export default function AddMedModal({ isOpen, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("1 viên");
  const [period, setPeriod] = useState<"Sáng" | "Trưa" | "Tối" | "Trước ngủ">("Sáng");
  const [time, setTime] = useState("08:00");
  const [instruction, setInstruction] = useState("Uống sau ăn");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const quickMeds = [
    { name: "Amlodipine 5mg", period: "Sáng", time: "08:00", instruction: "Uống sau ăn sáng" },
    { name: "Metformin 500mg", period: "Trưa", time: "12:00", instruction: "Uống sau ăn trưa" },
    { name: "Atorvastatin 10mg", period: "Tối", time: "20:00", instruction: "Uống sau ăn tối" },
    { name: "Vitamin B1 250mg", period: "Trước ngủ", time: "22:00", instruction: "Uống trước khi ngủ" },
    { name: "Canxi Nano D3", period: "Sáng", time: "08:00", instruction: "Uống cùng nhiều nước sau ăn" },
    { name: "Omega 3 Dầu cá", period: "Trưa", time: "12:00", instruction: "Uống sau ăn" }
  ];

  const handleQuickSelect = (item: any) => {
    setName(item.name);
    setPeriod(item.period);
    setTime(item.time);
    setInstruction(item.instruction);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: String(Date.now()),
      name,
      dosage,
      period,
      time,
      instruction: `${instruction} ${note ? `(${note})` : ""}`.trim(),
      status: "future"
    });

    // Reset form
    setName("");
    setNote("");
    onClose();
  };

  const handlePeriodChange = (newPeriod: "Sáng" | "Trưa" | "Tối" | "Trước ngủ") => {
    setPeriod(newPeriod);
    if (newPeriod === "Sáng") setTime("08:00");
    else if (newPeriod === "Trưa") setTime("12:00");
    else if (newPeriod === "Tối") setTime("20:00");
    else setTime("22:00");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Plus size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A2B4B]">Thêm thuốc cho Ông Minh</h3>
              <p className="text-gray-400 text-xs">Cài đặt giờ và hướng dẫn uống thuốc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Quick suggestions */}
          <div>
            <span className="text-xs font-bold text-gray-500 mb-1.5 block">Gợi ý thuốc nhanh phổ biến:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickMeds.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickSelect(m)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    name === m.name
                      ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Tên thuốc (*)</label>
            <div className="flex items-center border-2 border-gray-200 rounded-2xl px-3.5 py-3 focus-within:border-emerald-600 bg-gray-50/50">
              <Pill size={18} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Metformin 500mg, Panadol..."
                className="w-full bg-transparent text-[#1A2B4B] font-semibold text-sm outline-none placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>
          </div>

          {/* Dosage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Liều lượng</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="1 viên"
                className="w-full border-2 border-gray-200 rounded-2xl px-3.5 py-2.5 bg-gray-50/50 text-sm font-semibold text-[#1A2B4B] outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Giờ nhắc</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl px-3 py-2 bg-gray-50/50 focus-within:border-emerald-600">
                <Clock size={16} className="text-gray-400 mr-1.5 shrink-0" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-[#1A2B4B] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Period selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Buổi uống trong ngày</label>
            <div className="grid grid-cols-4 gap-2">
              {(["Sáng", "Trưa", "Tối", "Trước ngủ"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`py-2 px-1 text-xs rounded-xl font-bold border transition-all ${
                    period === p
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Cách dùng</label>
            <div className="grid grid-cols-3 gap-2">
              {["Uống sau ăn", "Uống trước ăn", "Uống cùng nước ấm"].map((inst) => (
                <button
                  type="button"
                  key={inst}
                  onClick={() => setInstruction(inst)}
                  className={`py-2 px-1 text-[11px] rounded-xl font-semibold border transition-all ${
                    instruction === inst
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Lời dặn riêng cho Ông Minh</label>
            <div className="flex items-start border-2 border-gray-200 rounded-2xl p-3 focus-within:border-emerald-600 bg-gray-50/50">
              <FileText size={16} className="text-gray-400 mr-2 mt-0.5 shrink-0" />
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Bố uống thuốc này nhớ uống nhiều nước nhé..."
                className="w-full bg-transparent text-sm text-[#1A2B4B] outline-none resize-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Check size={20} />
              Lưu vào lịch thuốc của Ông Minh
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
