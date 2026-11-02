import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, ScanLine, Search, GraduationCap, ClipboardList } from "lucide-react";

const tabs = [
  { label: "Home", path: "/", icon: LayoutDashboard },
  { label: "Files", path: "/files", icon: FolderOpen },
  { label: "Students", path: "/students", icon: GraduationCap },
  { label: "Board", path: "/board", icon: ClipboardList },
  { label: "Scan", path: "/scan", icon: ScanLine },
  { label: "Search", path: "/search", icon: Search },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path !== "/" && location.pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}