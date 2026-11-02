import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

export default function FilePreviewModal({ open, onClose, file }) {
  if (!file) return null;
  const t = (file.file_type || "").toLowerCase();
  const isImage = t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif") || t.includes("webp");
  const isPdf = t.includes("pdf");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0">
          {isImage ? (
            <img src={file.file_url} alt={file.name} className="w-full rounded-lg object-contain max-h-[60vh]" />
          ) : isPdf ? (
            <iframe src={file.file_url} className="w-full h-[60vh] rounded-lg border" title={file.name} />
          ) : (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm">Preview not available for this file type.</p>
              <p className="text-xs mt-1">Download the file to view it.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => window.open(file.file_url, "_blank")}>
            <ExternalLink className="w-4 h-4 mr-2" /> Open
          </Button>
          <a href={file.file_url} download={file.name}>
            <Button>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}