const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Search, X, Filter, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/mobile/ActionSheet";
import PageContainer from "@/components/layout/PageContainer";
import FileCard from "@/components/files/FileCard";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import MoveFileModal from "@/components/files/MoveFileModal";
import { useToast } from "@/components/ui/use-toast";

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [allFiles, setAllFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [moveFile, setMoveFile] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      db.entities.SchoolFile.list("-created_date", 200),
      db.entities.Folder.list(),
    ]).then(([files, foldersData]) => {
      setAllFiles(files);
      setFolders(foldersData);
      setLoading(false);
    });
  }, []);

  const filtered = allFiles.filter((file) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || file.name.toLowerCase().includes(q) || file.tags?.some((t) => t.toLowerCase().includes(q)) || file.notes?.toLowerCase().includes(q);
    const matchesSource = sourceFilter === "all" || file.source === sourceFilter;
    const matchesFolder = folderFilter === "all" || file.folder_id === folderFilter || (folderFilter === "none" && !file.folder_id);
    return matchesQuery && matchesSource && matchesFolder;
  });

  const handleDelete = async (file) => {
    try {
      await db.entities.SchoolFile.delete(file.id);
      setAllFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast({ title: "File deleted" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const reload = async () => {
    const files = await db.entities.SchoolFile.list("-created_date", 200);
    setAllFiles(files);
  };

  return (
    <PageContainer>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">Search Records</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Find any file by name, tags, or notes</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            placeholder="Search by file name, tags, or notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-slate-50 rounded-xl border-0 text-sm focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all outline-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Filters:</span>
          </div>
          <MobileSelect
            value={sourceFilter}
            onValueChange={setSourceFilter}
            placeholder="All Sources"
            options={[
              { value: "all", label: "All Sources" },
              { value: "upload", label: "Uploaded" },
              { value: "scan", label: "Scanned" },
            ]}
            triggerClassName="w-36 h-8 text-xs"
          />
          <MobileSelect
            value={folderFilter}
            onValueChange={setFolderFilter}
            placeholder="All Folders"
            options={[
              { value: "all", label: "All Folders" },
              { value: "none", label: "No Folder" },
              ...folders.map((f) => ({ value: f.id, label: f.name })),
            ]}
            triggerClassName="w-44 h-8 text-xs"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{query ? "No files match your search" : "No files found"}</p>
          <p className="text-sm text-slate-400 mt-1">{query ? "Try different keywords or adjust filters" : "Upload some files to get started"}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((file) => (
              <FileCard key={file.id} file={file} onDelete={handleDelete} onMove={(f) => setMoveFile(f)} onView={setPreviewFile} />
            ))}
          </div>
        </>
      )}

      <FilePreviewModal open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
      {moveFile && <MoveFileModal open={!!moveFile} onClose={() => setMoveFile(null)} file={moveFile} onSuccess={reload} />}
      </div>
    </PageContainer>
  );
}