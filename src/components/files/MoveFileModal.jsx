const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Folder, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function MoveFileModal({ open, onClose, file, onSuccess }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      db.entities.Folder.list().then((data) => {
        setFolders(data);
        setLoading(false);
      });
    }
  }, [open]);

  const handleMove = async () => {
    setSaving(true);
    try {
      await db.entities.SchoolFile.update(file.id, { folder_id: selectedFolder });
      toast({ title: "File moved" });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move "{file?.name}"</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                selectedFolder === null ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <Folder className="w-4 h-4" /> Root (No Folder)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolder(f.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                  selectedFolder === f.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Folder className="w-4 h-4" style={{ color: f.color }} /> {f.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMove} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Move Here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}