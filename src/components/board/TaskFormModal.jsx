const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect } from "@/components/mobile/ActionSheet";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function TaskFormModal({ open, onClose, task, onSuccess }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title || "");
        setNotes(task.notes || "");
        setDueDate(task.due_date || "");
        setPriority(task.priority || "medium");
      } else {
        setTitle("");
        setNotes("");
        setDueDate("");
        setPriority("medium");
      }
    }
  }, [task, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim(),
        due_date: dueDate || null,
        priority,
      };
      if (task) {
        await db.entities.BoardTask.update(task.id, payload);
        toast({ title: "Task updated" });
      } else {
        await db.entities.BoardTask.create(payload);
        toast({ title: "Task added" });
      }
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
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>What do you need to do? *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Submit enrollment report" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <MobileSelect
                value={priority}
                onValueChange={setPriority}
                options={priorityOptions}
                placeholder="Priority"
                triggerClassName="w-full h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details..." rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : task ? "Save Changes" : "Add Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}