import React from "react";
import { FileText, Image, FileSpreadsheet, File, MoreVertical, Download, Trash2, FolderInput, Eye } from "lucide-react";
import ActionSheet from "@/components/mobile/ActionSheet";
import { formatDistanceToNow } from "date-fns";

const getFileIcon = (type) => {
  if (!type) return File;
  const t = type.toLowerCase();
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg")) return Image;
  if (t.includes("sheet") || t.includes("csv") || t.includes("excel") || t.includes("xlsx")) return FileSpreadsheet;
  if (t.includes("pdf") || t.includes("doc") || t.includes("text")) return FileText;
  return File;
};

const getIconColor = (type) => {
  if (!type) return "text-slate-400";
  const t = type.toLowerCase();
  if (t.includes("image") || t.includes("png") || t.includes("jpg")) return "text-emerald-500";
  if (t.includes("pdf")) return "text-red-500";
  if (t.includes("sheet") || t.includes("csv") || t.includes("xlsx")) return "text-green-600";
  if (t.includes("doc")) return "text-blue-500";
  return "text-slate-400";
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function FileCard({ file, onDelete, onMove, onView }) {
  const Icon = getFileIcon(file.file_type);
  const iconColor = getIconColor(file.file_type);

  const items = [
    { label: "View", icon: <Eye className="w-4 h-4 mr-2" />, onClick: () => onView?.(file) },
    { label: "Download", icon: <Download className="w-4 h-4 mr-2" />, onClick: () => window.open(file.file_url, "_blank") },
    { label: "Move to Folder", icon: <FolderInput className="w-4 h-4 mr-2" />, onClick: () => onMove?.(file) },
    { label: "Delete", icon: <Trash2 className="w-4 h-4 mr-2" />, onClick: () => onDelete?.(file), className: "text-red-600" },
  ];

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{formatSize(file.file_size)}</span>
            {file.source === "scan" && (
              <span className="text-xs bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded font-medium">Scanned</span>
            )}
          </div>
          {file.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {file.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
              {file.tags.length > 3 && <span className="text-xs text-slate-400">+{file.tags.length - 3}</span>}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">{formatDistanceToNow(new Date(file.created_date), { addSuffix: true })}</p>
        </div>
        <ActionSheet
          items={items}
          trigger={
            <button className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity select-none">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          }
        />
      </div>
    </div>
  );
}