import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function StudentQRModal({ open, onClose, student }) {
  const qrRef = useRef(null);

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(student?.name || "student").replace(/\s+/g, "_")}_qr.png`;
    a.click();
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Student QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="p-4 bg-white rounded-2xl border border-slate-100">
            <QRCodeCanvas value={student.id} size={220} level="M" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
            {student.student_number && <p className="text-sm text-slate-400">{student.student_number}</p>}
          </div>
          <p className="text-xs text-slate-400 text-center max-w-[260px]">
            Scan this code with the QR scanner to instantly view all files for this student
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownload}><Download className="w-4 h-4 mr-2" /> Download</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}