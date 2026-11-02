const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";

export default function FileUploadModal({ open, onClose, folderId, studentId, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [students, setStudents] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      Promise.all([db.entities.Student.list(), db.entities.Folder.list()])
        .then(([studentList, folderList]) => {
          setStudents(studentList);
          setFolders(folderList);
        })
        .catch(() => {});
      setSelectedStudentId(studentId || "");
      setSelectedFolderId(folderId || "");
    }
  }, [open, studentId, folderId]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      for (const file of files) {
        const { file_url } = await db.integrations.Core.UploadFile({ file });
        await db.entities.SchoolFile.create({
          name: file.name,
          file_url,
          file_type: file.type || file.name.split(".").pop(),
          file_size: file.size,
          folder_id: selectedFolderId || null,
          student_id: selectedStudentId || null,
          tags: tagList,
          notes,
          source: "upload",
        });
      }
      toast({ title: "Files uploaded", description: `${files.length} file(s) uploaded successfully.` });
      setFiles([]);
      setTags("");
      setNotes("");
      setSelectedStudentId(studentId || "");
      setSelectedFolderId(folderId || "");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
          onClick={() => document.getElementById("file-input-upload").click()}
        >
          <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">Supports all file types</p>
          <input id="file-input-upload" type="file" multiple className="hidden" onChange={handleFileSelect} />
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
                <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">Tags (comma-separated)</Label>
            <Input placeholder="e.g. grade-10, enrollment, 2026" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Link to Folder (optional)</Label>
            <Select value={selectedFolderId || "none"} onValueChange={(v) => setSelectedFolderId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Link to Student (optional)</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.grade ? ` — ${s.grade}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Notes (optional)</Label>
            <Textarea placeholder="Add any notes about these files..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</> : `Upload ${files.length} File${files.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}