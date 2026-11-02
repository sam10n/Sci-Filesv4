const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  QrCode,
  ScanLine,
  Loader2,
  ExternalLink,
  CameraOff,
  UserCheck,
  AlertCircle,
  GraduationCap
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import PageContainer from "@/components/layout/PageContainer";
import {
  isSecureContext,
  openStandalone,
  describeCameraError
} from "@/lib/cameraPermission";

export default function QRScanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const scannerRef = useRef(null);
  const pendingRef = useRef(false);
  const [manualId, setManualId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  // { studentId, student, loading, notFound }
  const [pendingScan, setPendingScan] = useState(null);

  const startScanner = useCallback(async () => {
    setStarting(true);
    setCameraError(null);
    pendingRef.current = false;
    setPendingScan(null);
    try {
      // Explicitly request camera permission first so the browser shows its prompt.
      const previewStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      previewStream.getTracks().forEach((t) => t.stop());

      const { Html5Qrcode } = await import("html5-qrcode");
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 25,
          qrbox: (w, h) => {
            const minEdge = Math.min(w, h);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        (decodedText) => {
          if (pendingRef.current) return;
          pendingRef.current = true;
          const studentId = decodedText.includes("/") ? decodedText.split("/").pop() : decodedText;
          scanner.stop().catch(() => {});
          setPendingScan({ studentId, student: null, loading: true, notFound: false });
        },
        () => {}
      );
      setStarting(false);
    } catch (err) {
      setStarting(false);
      const info = describeCameraError(err);
      setCameraError(info);
      toast({ title: info.title, description: info.description, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (!isSecureContext()) {
      setStarting(false);
      setCameraError({
        title: "Camera needs a secure connection",
        description: "Camera access only works over HTTPS. Please open the app via its https:// link."
      });
      return;
    }
    startScanner();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, [startScanner]);

  // Look up the student once a QR is decoded.
  useEffect(() => {
    if (!pendingScan?.studentId) return;
    if (pendingScan.student || pendingScan.notFound) return;
    let cancelled = false;
    db.entities.Student
      .get(pendingScan.studentId)
      .then((student) => { if (!cancelled) setPendingScan((s) => ({ ...s, student, loading: false })); })
      .catch(() => { if (!cancelled) setPendingScan((s) => ({ ...s, loading: false, notFound: true })); });
    return () => { cancelled = true; };
  }, [pendingScan?.studentId]);

  const handleConfirm = async () => {
    if (!pendingScan) return;
    const id = pendingScan.studentId;
    setPendingScan(null); // close dialog first so its body scroll-lock is released
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    navigate(`/students/${id}`);
  };

  const handleCancelScan = () => {
    setPendingScan(null);
    startScanner();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const q = manualId.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const students = await db.entities.Student.list();
      const ql = q.toLowerCase();
      const matches = students.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(ql) ||
          (s.student_number || "").toLowerCase().includes(ql)
      );
      setSearchResults(matches);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const goToStudent = (id) => {
    setSearchResults(null);
    setManualId("");
    navigate(`/students/${id}`);
  };

  const student = pendingScan?.student;

  return (
    <PageContainer>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">Scan Student QR</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Point your camera at a student's QR code</p>
        </div>

        <div className="bg-black rounded-2xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
          <div id="qr-reader" className="w-full [&_video]:rounded-2xl" />
          {starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Starting camera...</p>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full flex gap-3">
                <CameraOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{cameraError.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cameraError.description}</p>
                  {cameraError.showOpenButton && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => openStandalone("/scan-qr")}>
                      <ExternalLink className="w-4 h-4 mr-2" /> Open in new tab
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-8 border-2 border-white/40 rounded-xl pointer-events-none">
            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
          <div className="relative flex justify-center"><span className="bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-400">or search for a student</span></div>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Search by name or student ID" />
          <Button type="submit" disabled={!manualId.trim() || searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {searchResults !== null && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No students found.</p>
            ) : (
              searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => goToStudent(s.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{s.name}</p>
                    {(s.grade || s.student_number) && (
                      <p className="text-xs text-slate-400 truncate">
                        {s.grade}{s.grade && s.student_number ? " · " : ""}{s.student_number ? `ID: ${s.student_number}` : ""}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog
        open={!!pendingScan}
        onOpenChange={(open) => { if (!open && pendingScan && !pendingScan.loading) handleCancelScan(); }}
      >
        <DialogContent className="max-w-sm">
          {pendingScan?.loading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Looking up student...</p>
            </div>
          ) : pendingScan?.notFound ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" /> Student not found
                </DialogTitle>
                <DialogDescription>This QR code isn't linked to any student record.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleCancelScan}>Try again</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-500" /> Confirm student
                </DialogTitle>
                <DialogDescription>You're about to open this student's records.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 py-2">
                {student?.photo_url ? (
                  <img src={student.photo_url} alt={student.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <GraduationCap className="w-7 h-7 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{student?.name}</p>
                  {student?.grade && <p className="text-sm text-slate-500 dark:text-slate-400">{student.grade}</p>}
                  {student?.student_number && <p className="text-xs text-slate-400">ID: {student.student_number}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancelScan}>Retry</Button>
                <Button onClick={handleConfirm}>Confirm</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}