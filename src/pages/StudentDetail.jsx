const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Upload, QrCode, Edit2, GraduationCap, ArrowLeft, FileText, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileCard from "@/components/files/FileCard";
import FileUploadModal from "@/components/files/FileUploadModal";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import StudentFormModal from "@/components/students/StudentFormModal";
import StudentQRModal from "@/components/students/StudentQRModal";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);
  const { toast } = useToast();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const student = await db.entities.Student.get(id);
      const allFiles = await db.entities.SchoolFile.list("-created_date", 500);
      return { student, files: allFiles.filter((f) => f.student_id === id) };
    },
  });

  const student = data?.student;
  const files = data?.files ?? [];

  const handleDelete = async (file) => {
    try {
      await db.entities.SchoolFile.delete(file.id);
      toast({ title: "File deleted" });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      await db.entities.Student.update(id, { photo_url: file_url });
      toast({ title: "Photo updated" });
      refetch();
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-700" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 dark:text-slate-400">Student not found</p>
        <Button variant="outline" onClick={() => navigate("/students")}>Back to Students</Button>
      </div>
    );
  }

  const displayGrade = student.grade || (student.grade_number != null ? `Grade ${student.grade_number}` : null);

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 truncate">{student.name}</h1>
            {isFetching && <p className="text-xs text-slate-400">Refreshing...</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.name} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-9 h-9 text-white" />
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {photoUploading ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <Camera className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{student.name}</h2>
              {displayGrade && <p className="text-sm text-slate-500 dark:text-slate-400">{displayGrade}{student.section ? ` · Section ${student.section}` : ""}</p>}
              {student.student_number && <p className="text-sm text-slate-400">LRN: {student.student_number}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-sm">
                {student.age != null && (
                  <p className="text-slate-500 dark:text-slate-400"><span className="text-slate-400">Age:</span> {student.age}</p>
                )}
                {student.email && (
                  <p className="text-slate-500 dark:text-slate-400 truncate"><span className="text-slate-400">Email:</span> {student.email}</p>
                )}
                {student.address && (
                  <p className="text-slate-500 dark:text-slate-400 sm:col-span-2"><span className="text-slate-400">Address:</span> {student.address}</p>
                )}
              </div>
              {student.notes && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{student.notes}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="w-4 h-4 mr-2" /> QR Code
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)} className="ml-auto">
              <Upload className="w-4 h-4 mr-2" /> Upload
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Files ({files.length})
          </h2>
          {files.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No files for this student</p>
              <p className="text-sm text-slate-400 mt-1">Upload documents to associate them with this student</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((file) => (
                <FileCard key={file.id} file={file} onDelete={handleDelete} onView={setPreviewFile} />
              ))}
            </div>
          )}
        </div>
      </div>

      <FileUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} studentId={id} onSuccess={refetch} />
      <FilePreviewModal open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
      <StudentFormModal open={editOpen} onClose={() => setEditOpen(false)} student={student} onSuccess={refetch} />
      {qrOpen && <StudentQRModal open={qrOpen} onClose={() => setQrOpen(false)} student={student} />}
    </PullToRefresh>
  );
}