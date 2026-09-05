import { useState } from "react";
import { 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Phone, 
  Trash2, 
  CheckCheck,
  AlertTriangle,
  CheckSquare,
  Bot
} from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  onOpenCall: () => void;
}

export default function NotificationsScreen({ onOpenCall }: Props) {
  const [filter, setFilter] = useState<"all" | "overdue" | "taken" | "system">("all");

  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "overdue",
      title: "CẢNH BÁO: Quá giờ uống thuốc!",
      message: "Ông Minh chưa xác nhận uống Metformin 500mg (cữ trưa 12:00). Đã quá giờ 35 phút!",
      timestamp: "12:35 hôm nay",
      isUnread: true,
      actionable: true
    },
    {
      id: "2",
      type: "taken",
      title: "Đã uống thuốc đúng giờ",
      message: "Ông Minh đã uống xong Amlodipine 5mg lúc 08:05 theo đúng lịch.",
      timestamp: "08:05 hôm nay",
      isUnread: true,
      actionable: false
    },
    {
      id: "3",
      type: "system",
      title: "Trợ lý AI tổng kết buổi sáng",
      message: "Hôm nay Ông Minh có 4 cữ thuốc cần uống. Nhiệt độ tăng cao, nhắc ông uống thêm nước.",
      timestamp: "07:00 hôm nay",
      isUnread: false,
      actionable: false
    },
    {
      id: "4",
      type: "overdue",
      title: "Cữ tối qua bị trễ giờ",
      message: "Atorvastatin 10mg đã bị trễ hơn 40 phút vào tối qua trước khi được uống bù.",
      timestamp: "20:45 hôm qua",
      isUnread: false,
      actionable: false
    },
    {
      id: "5",
      type: "system",
      title: "Cảnh báo số lượng thuốc sắp hết",
      message: "Hộp thuốc Metformin 500mg của Ông Minh chỉ còn lại 4 viên. Vui lòng mua bổ sung sớm.",
      timestamp: "16:00 hôm qua",
      isUnread: false,
      actionable: false
    }
  ]);

  const filteredList = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-h-full bg-[#F4F7FB] animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 relative mt-2">
        <h1 className="text-2xl font-bold text-[#1a2b4b] w-full text-center">Thông báo & Lịch sử</h1>
        <button
          onClick={markAllRead}
          className="absolute right-0 flex items-center gap-1 text-primary font-bold text-xs bg-blue-50 px-2.5 py-1.5 rounded-full hover:bg-blue-100"
        >
          <CheckCheck size={14} /> Đọc hết
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
        {[
          { key: "all", label: "Tất cả", icon: null },
          { key: "overdue", label: "Quá giờ", icon: (active: boolean) => <AlertTriangle size={16} className={active ? "text-white" : "text-amber-500"} /> },
          { key: "taken", label: "Đã uống", icon: (active: boolean) => <CheckSquare size={16} className={active ? "text-white" : "text-emerald-500"} /> },
          { key: "system", label: "Trợ lý AI", icon: (active: boolean) => <Bot size={16} className={active ? "text-white" : "text-purple-500"} /> }
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={cn(
                "px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 shrink-0 flex items-center gap-1.5",
                isActive
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tab.icon && tab.icon(isActive)}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3 mt-1">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
            <Bell size={36} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1a2b4b]">Không có thông báo nào</p>
            <p className="text-xs text-gray-400 mt-0.5">Mọi cữ thuốc đều đang được kiểm soát tốt</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isOverdue = item.type === "overdue";
            const isTaken = item.type === "taken";

            return (
              <div
                key={item.id}
                className={cn(
                  "p-4 rounded-3xl border shadow-sm transition-all flex flex-col gap-2.5 relative",
                  isOverdue 
                    ? "bg-white border-red-200" 
                    : "bg-white border-gray-100"
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        isOverdue
                          ? "bg-[#FFF0F0] text-danger"
                          : isTaken
                          ? "bg-[#EAF6ED] text-success"
                          : "bg-[#EBF1FF] text-primary"
                      )}
                    >
                      {isOverdue && <AlertCircle size={22} />}
                      {isTaken && <CheckCircle2 size={22} />}
                      {!isOverdue && !isTaken && <Sparkles size={22} />}
                    </div>

                    <div>
                      <h4
                        className={cn(
                          "text-sm font-extrabold leading-tight",
                          isOverdue ? "text-danger" : "text-[#1a2b4b]"
                        )}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[11px] text-gray-400 font-medium">{item.timestamp}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => clearNotification(item.id)}
                    className="text-gray-300 hover:text-danger p-1"
                    title="Xóa thông báo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Message Body */}
                <p className="text-xs text-gray-600 font-medium leading-relaxed pl-1">
                  {item.message}
                </p>

                {/* Overdue Action: Quick Call */}
                {item.actionable && (
                  <div className="pt-2 border-t border-red-100 flex gap-2">
                    <button
                      onClick={onOpenCall}
                      className="flex-1 bg-danger hover:bg-danger/90 active:scale-95 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_10px_rgba(220,38,38,0.25)] transition-all cursor-pointer"
                    >
                      <Phone size={14} className="fill-white" />
                      GỌI ĐIỆN NHẮC ÔNG MINH NGAY
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
