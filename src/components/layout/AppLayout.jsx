const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  ScanLine,
  Search,
  LogOut,
  Menu,
  X,
  FileText,
  ChevronLeft,
  Trash2,
  GraduationCap,
  QrCode,
  ClipboardList } from
"lucide-react";

import { Button } from "@/components/ui/button";
import MobileNav from "@/components/mobile/MobileNav";
import AnimatedOutlet from "@/components/layout/AnimatedOutlet";
import DeleteAccountDialog from "@/components/layout/DeleteAccountDialog";

const navItems = [
{ label: "Dashboard", path: "/", icon: LayoutDashboard },
{ label: "Files", path: "/files", icon: FolderOpen },
{ label: "Students", path: "/students", icon: GraduationCap },
{ label: "Scan Document", path: "/scan", icon: ScanLine },
{ label: "Scan QR", path: "/scan-qr", icon: QrCode },
{ label: "Board", path: "/board", icon: ClipboardList },
{ label: "Search", path: "/search", icon: Search }];

const getPageTitle = (pathname) => {
  if (pathname === "/") return "SchoolVault";
  if (pathname.startsWith("/scan-qr")) return "Scan QR";
  if (pathname.startsWith("/scan")) return "Scan Document";
  if (pathname.startsWith("/search")) return "Search";
  if (pathname.startsWith("/students")) return "Students";
  if (pathname.startsWith("/board")) return "My Board";
  if (pathname.startsWith("/files")) return "Files";
  return "SchoolVault";
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const handleLogout = () => db.auth.logout("/login");
  const isRoot = location.pathname === "/";

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col fixed inset-y-0 z-30 select-none">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl from-blue-600 to-indigo-600 flex items-center justify-center text-[#7388ae] bg-[#788fb0]">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                Sci-Files
                </h1>
                <p className="text-xs text-slate-400">Records Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
            location.pathname === item.path ||
            item.path !== "/" && location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none ${
                isActive ?
                "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300" :
                "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"}`
                }>
                
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                {item.label}
              </Link>);

          })}
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <button
            onClick={() => setDeleteAccountOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all w-full select-none">
            
            <Trash2 className="w-5 h-5" />
            Delete Account
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all w-full select-none">
            
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen min-w-0">
        {/* Mobile Header */}
        <header
          className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 select-none"
          style={{ paddingTop: "env(safe-area-inset-top)" }}>
          
          <div className="px-2 py-2.5 flex items-center justify-between h-14">
            <div className="flex items-center gap-1 min-w-0">
              {!isRoot &&
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="select-none shrink-0">
                
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              }
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 bg-[#1b2040]">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h1 className="font-heading font-bold text-slate-900 dark:text-slate-100 truncate">
                  {getPageTitle(location.pathname)}
                </h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="select-none shrink-0">
              
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileOpen &&
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setMobileOpen(false)}>
          
            <div
            className="absolute top-14 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-1"
            style={{ top: "calc(2.5rem + env(safe-area-inset-top))" }}
            onClick={(e) => e.stopPropagation()}>
            
              <button
              onClick={() => {
                setDeleteAccountOpen(true);
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 w-full select-none">
              
                <Trash2 className="w-5 h-5" />
                Delete Account
              </button>
              <button
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 w-full select-none">
              
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        }

        {/* Scrollable Content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatedOutlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      <DeleteAccountDialog
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)} />
      
    </div>);

}