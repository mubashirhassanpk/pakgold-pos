"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Coins,
  Package,
  Users,
  Wrench,
  Hammer,
  CalendarPlus,
  Truck,
  FileText,
  Wallet,
  Receipt,
  CalendarCheck,
  Scale,
  ScrollText,
  BarChart3,
  Settings,
  PiggyBank,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/lib/authActions";

const nav = [
  { href: "/", area: "dashboard", label: "Dashboard", labelUr: "ڈیش بورڈ", icon: LayoutDashboard },
  { href: "/pos", area: "pos", label: "New Sale", labelUr: "نئی فروخت", icon: ShoppingCart },
  { href: "/buy-gold", area: "buygold", label: "Buy Old Gold", labelUr: "پرانا سونا خریدیں", icon: Coins },
  { href: "/rates", area: "rates", label: "Gold Rates", labelUr: "سونے کا ریٹ", icon: Coins },
  { href: "/inventory", area: "inventory", label: "Inventory", labelUr: "اسٹاک", icon: Package },
  { href: "/customers", area: "customers", label: "Customers", labelUr: "گاہک", icon: Users },
  { href: "/committees", area: "committees", label: "Committees / BC", labelUr: "کمیٹی", icon: PiggyBank },
  { href: "/repairs", area: "repairs", label: "Repairs", labelUr: "مرمت", icon: Wrench },
  { href: "/bookings", area: "bookings", label: "Bookings", labelUr: "بکنگ / بیعانہ", icon: CalendarPlus },
  { href: "/karigars", area: "karigars", label: "Karigars", labelUr: "کاریگر", icon: Hammer },
  { href: "/suppliers", area: "suppliers", label: "Suppliers", labelUr: "سپلائر", icon: Truck },
  { href: "/invoices", area: "invoices", label: "Invoices", labelUr: "رسیدیں", icon: FileText },
  { href: "/receivables", area: "receivables", label: "Udhaar", labelUr: "ادھار", icon: Wallet },
  { href: "/expenses", area: "expenses", label: "Expenses", labelUr: "اخراجات", icon: Receipt },
  { href: "/day-close", area: "dayclose", label: "Day Close", labelUr: "روزنامچہ", icon: CalendarCheck },
  { href: "/gold-ledger", area: "goldledger", label: "Gold Ledger", labelUr: "وزن کھاتہ", icon: Scale },
  { href: "/reports", area: "reports", label: "Reports", labelUr: "رپورٹس", icon: BarChart3 },
  { href: "/audit", area: "audit", label: "Audit Log", labelUr: "آڈٹ", icon: ScrollText },
  { href: "/settings", area: "settings", label: "Settings", labelUr: "ترتیبات", icon: Settings },
];

export function Sidebar({
  user,
  collapsed = false,
  onNavigate,
}: {
  user: { name: string; role: string; allowed: string[] };
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = nav.filter((n) => n.area === "dashboard" || user.allowed.includes(n.area));

  return (
    <aside
      className={`no-print h-full ${collapsed ? "w-[68px]" : "w-60"} shrink-0 bg-navy-900 text-white flex flex-col transition-[width] duration-200`}
    >
      <div className={`border-b border-white/10 ${collapsed ? "px-3 py-4 text-center" : "px-5 py-5"}`}>
        {collapsed ? (
          <div className="text-xl font-bold tracking-tight">
            <span className="text-gold">P</span>G
          </div>
        ) : (
          <>
            <div className="text-xl font-bold tracking-tight">
              <span className="text-gold">Pak</span>Gold
              <span className="text-xs font-normal text-white/50 ml-1">POS</span>
            </div>
            <div className="urdu text-gold/80 text-sm mt-1">پاک گولڈ</div>
          </>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-gold text-navy-900 font-semibold"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  <span className="urdu ml-auto text-xs opacity-70">{item.labelUr}</span>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-gold/70 capitalize">{user.role}</div>
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            title="Logout"
            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={16} className="shrink-0" /> {!collapsed && "Logout"}
          </button>
        </form>
      </div>
    </aside>
  );
}
