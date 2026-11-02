const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { UserPlus, QrCode, Trash2, GraduationCap, Loader2, Search, X, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentFormModal from "@/components/students/StudentFormModal";
import StudentQRModal from "@/components/students/StudentQRModal";
import PromoteGradesModal from "@/components/students/PromoteGradesModal";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Students() {
  const [formOpen, setFormOpen] = useState(false);
  const [qrStudent, setQrStudent] = useState(null);
  const [deleteStudent, setDeleteStudent] = useState(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const [students, files] = await Promise.all([
        db.entities.Student.list("-created_date", 200),
        db.entities.SchoolFile.list("-created_date", 500),
      ]);
      return { students, files };
    },
  });

  const students = data?.students ?? [];
  const files = data?.files ?? [];

  const q = query.toLowerCase();
  const filtered = q
    ? students.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.grade?.toLowerCase().includes(q) ||
          s.student_number?.toLowerCase().includes(q) ||
          s.section?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          (s.age != null && String(s.age) === q) ||
          (s.grade_number != null && `grade ${s.grade_number}`.includes(q))
      )
    : students;

  const getFileCount = (studentId) => files.filter((f) => f.student_id === studentId).length;

  const handleDelete = async () => {
    if (!deleteStudent) return;
    try {
      await db.entities.Student.delete(deleteStudent.id);
      toast({ title: "Student deleted" });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteStudent(null);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-700" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">Students</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isFetching ? "Refreshing..." : "Create QR codes and manage student records"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setPromoteOpen(true)}>
              <ArrowUpCircle className="w-4 h-4 mr-2" /> Promote
            </Button>
            <Link to="/scan-qr">
              <Button variant="outline" size="sm">
                <QrCode className="w-4 h-4 mr-2" /> Scan QR
              </Button>
            </Link>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
          <input
            type="text"
            placeholder="Search by name, grade, section, address, email, age..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition-all dark:text-slate-100"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
            <GraduationCap className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{query ? "No students match your search" : "No students yet"}</p>
            <p className="text-sm text-slate-400 mt-1">{query ? "Try different keywords" : "Add a student to generate their QR code"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((student) => {
              const count = getFileCount(student.id);
              const displayGrade = student.grade || (student.grade_number != null ? `Grade ${student.grade_number}` : null);
              return (
                <div key={student.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                  <div className="flex items-start gap-3">
                    <Link to={`/students/${student.id}`} className="shrink-0">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.name} className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </Link>
                    <Link to={`/students/${student.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400">{student.name}</h3>
                      {displayGrade && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{displayGrade}</p>}
                      {student.student_number && <p className="text-xs text-slate-400 truncate">LRN: {student.student_number}</p>}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400">{count} file{count !== 1 ? "s" : ""}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setQrStudent(student)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors">
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteStudent(student)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StudentFormModal open={formOpen} onClose={() => setFormOpen(false)} onSuccess={refetch} />
      {qrStudent && <StudentQRModal open={!!qrStudent} onClose={() => setQrStudent(null)} student={qrStudent} />}
      <PromoteGradesModal open={promoteOpen} onClose={() => setPromoteOpen(false)} students={students} onSuccess={refetch} />

      <AlertDialog open={!!deleteStudent} onOpenChange={() => setDeleteStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteStudent?.name}". Associated files will remain but lose their student link. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PullToRefresh>
  );
}