import React from "react";
import { Folder, MoreVertical, Trash2, Pencil } from "lucide-react";
import ActionSheet from "@/components/mobile/ActionSheet";
import { Link } from "react-router-dom";

export default function FolderCard({ folder, fileCount, onDelete, onEdit }) {
  const items = [
    { label: "Rename", icon: <Pencil className="w-4 h-4 mr-2" />, onClick: () => onEdit?.(folder) },
    { label: "Delete", icon: <Trash2 className="w-4 h-4 mr-2" />, onClick: () => onDelete?.(folder), className: "text-red-600" },
  ];

  return (
    <Link to={`/files/folder/${folder.id}`} className="block group">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: folder.color + "15" }}>
            <Folder className="w-5 h-5" style={{ color: folder.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{folder.name}</p>
            {folder.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{folder.description}</p>}
            <p className="text-xs text-slate-400 mt-1">{fileCount} file{fileCount !== 1 ? "s" : ""}</p>
          </div>
          <div onClick={(e) => e.preventDefault()}>
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
      </div>
    </Link>
  );
}