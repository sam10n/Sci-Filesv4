const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { FolderOpen, FileText, ScanLine, Upload, Search, Clock, ArrowRight, GraduationCap, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUploadModal from "@/components/files/FileUploadModal";
import FileCard from "@/components/files/FileCard";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import PullToRefresh from "@/components/mobile/PullToRefresh";

export default function Dashboard() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [files, folders, students] = await Promise.all([
      db.entities.SchoolFile.list("-created_date", 50),
      db.entities.Folder.list(),
      db.entities.Student.list()]
      );
      return { files, folders, students };
    }
  });

  const stats = data ?
  {
    files: data.files.length,
    folders: data.folders.length,
    scanned: data.files.filter((f) => f.source === "scan").length,
    students: data.students.length
  } :
  { files: 0, folders: 0, scanned: 0, students: 0 };
  const recentFiles = data?.files.slice(0, 6) ?? [];

  const statCards = [
  { label: "Total Files", value: stats.files, icon: FileText, accent: "from-blue-500 to-blue-600", tint: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  { label: "Folders", value: stats.folders, icon: FolderOpen, accent: "from-amber-500 to-orange-500", tint: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  { label: "Scanned Docs", value: stats.scanned, icon: ScanLine, accent: "from-teal-500 to-emerald-500", tint: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500" },
  { label: "Students", value: stats.students, icon: GraduationCap, accent: "from-violet-500 to-purple-600", tint: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", bar: "bg-violet-500" }];

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin" />
      </div>);

  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isFetching ? "Refreshing..." : "Manage your school records and documents"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/scan">
              <Button variant="outline" size="sm">
                <ScanLine className="w-4 h-4 mr-2" /> Scan
              </Button>
            </Link>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((s) =>
          <div key={s.label} className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all duration-200 ${s.tint}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${s.bar}`} />
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bar} text-white shadow-sm`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => setUploadOpen(true)} className="bg-[#4a6bb8] text-white rounded-2xl p-5 text-left hover:shadow-lg transition-shadow select-none">
            <Upload className="w-8 h-8 mb-3 opacity-80" />
            <p className="font-semibold">Upload Files</p>
            <p className="text-sm opacity-70 mt-1">Add documents to your vault</p>
          </button>
          <Link to="/scan" className="bg-[#4a6bb8] text-white rounded-2xl p-5 text-left hover:shadow-lg transition-shadow">
            <ScanLine className="w-8 h-8 mb-3 opacity-80" />
            <p className="font-semibold">Scan Document</p>
            <p className="text-sm opacity-70 mt-1">Use camera to scan papers</p>
          </Link>
          <Link to="/students" className="bg-[#4a6bb8] text-white rounded-2xl p-5 text-left hover:shadow-lg transition-shadow">
            <GraduationCap className="w-8 h-8 mb-3 opacity-80" />
            <p className="font-semibold">Students</p>
            <p className="text-sm opacity-70 mt-1">Manage QR codes & records</p>
          </Link>
          <Link to="/scan-qr" className="bg-[#4a6bb8] text-white rounded-2xl p-5 text-left hover:shadow-lg transition-shadow">
            <QrCode className="w-8 h-8 mb-3 opacity-80" />
            <p className="font-semibold">Scan QR</p>
            <p className="text-sm opacity-70 mt-1">Find student files instantly</p>
          </Link>
        </div>

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> Recent Files
            </h2>
            <Link to="/files" className="text-sm dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1 text-[#060a14]">View All

            </Link>
          </div>
          {recentFiles.length === 0 ?
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No files yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload or scan your first document to get started</p>
            </div> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentFiles.map((file) =>
            <FileCard key={file.id} file={file} onView={setPreviewFile} />
            )}
            </div>
          }
        </div>
      </div>

      <FileUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={refetch} />
      <FilePreviewModal open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
    </PullToRefresh>);

}