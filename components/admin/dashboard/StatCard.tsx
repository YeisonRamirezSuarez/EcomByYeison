import type { LucideIcon } from "lucide-react";

const StatCard = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: LucideIcon }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-shop_dark_green mt-1">{value}</p>
    </div>
    <span className="w-10 h-10 rounded-xl bg-shop_light_pink text-shop_orange flex items-center justify-center">
      <Icon size={20} />
    </span>
  </div>
);

export default StatCard;
