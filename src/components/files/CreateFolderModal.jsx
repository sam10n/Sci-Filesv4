const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

export default function CreateFolderModal({ open, onClose, parentFolderId, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await db.entities.Folder.create({
        name: name.trim(),
        description,
        color,
        parent_folder_id: parentFolderId || null,
      });
      toast({ title: "Folder created", description: `"${name}" has been created.` });
      setName("");
      setDescription("");
      setColor(COLORS[0]);
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
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Folder Name</Label>
            <Input placeholder="e.g. Student Records 2026" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea placeholder="What will this folder contain?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}