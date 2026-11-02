const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef, useCallback, useEffect } from "react";

import { Camera, RotateCcw, Check, Upload, Loader2, ScanLine, X, ExternalLink, CameraOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileSelect } from "@/components/mobile/ActionSheet";
import PageContainer from "@/components/layout/PageContainer";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  isSecureContext,
  openStandalone,
  describeCameraError
} from "@/lib/cameraPermission";

export default function ScanDocument() {
  const [mode, setMode] = useState("idle"); // idle, camera, preview
  const [capturedImage, setCapturedImage] = useState(null);
  const [fileMime, setFileMime] = useState("");
  const [fileName, setFileName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tags, setTags] = useState("");
  const [folders, setFolders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    db.entities.Folder.list().then(setFolders);
  }, []);

  const startCamera = async () => {
    setCameraError(null);

    // Camera requires a secure (HTTPS) context.
    if (!isSecureContext()) {
      setCameraError({
        title: "Camera needs a secure connection",
        description: "Camera access only works over HTTPS. Please open the app via its https:// link."
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      setMode("camera");
    } catch (err) {
      const info = describeCameraError(err);
      setCameraError(info);
      toast({ title: info.title, description: info.description, variant: "destructive" });
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Attach the stream to the <video> once it mounts in camera mode.
  useEffect(() => {
    if (mode !== "camera") return;
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
    setFileMime("image/jpeg");
    setFileName(`scan_${new Date().toISOString().slice(0, 10)}_${Date.now().toString(36)}.jpg`);
    stopCamera();
    setMode("preview");
  };

  const retake = () => {
    setCapturedImage(null);
    setFileMime("");
    startCamera();
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target.result);
      setFileMime(file.type || "application/octet-stream");
      setFileName(file.name || `scan_${Date.now()}.jpg`);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const handleUpload = async () => {
    if (!capturedImage) return;
    setUploading(true);
    try {
      const blob = dataURLtoBlob(capturedImage);
      const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      await db.entities.SchoolFile.create({
        name: fileName,
        file_url,
        file_type: blob.type || "image/jpeg",
        file_size: blob.size,
        folder_id: folderId || null,
        tags: tagList,
        source: "scan"
      });
      toast({ title: "Document saved", description: "Your scanned document has been uploaded." });
      navigate("/files");
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const cancelAll = () => {
    stopCamera();
    setCapturedImage(null);
    setFileMime("");
    setMode("idle");
    setFileName("");
    setTags("");
    setFolderId("");
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <PageContainer>
      <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">Scan Document</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Use your camera to scan and upload physical documents</p>
      </div>

      {mode === "idle" &&
        <div className="space-y-4">
          <button
            onClick={startCamera}
            className="w-full from-violet-600 to-purple-600 text-white rounded-2xl p-8 text-center hover:shadow-lg transition-shadow bg-[#788fb0]">

            <Camera className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <p className="text-xl font-semibold">Open Camera</p>
            <p className="text-sm opacity-70 mt-2">Take a photo of your document</p>
          </button>

          {cameraError && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 p-5 flex gap-3">
              <CameraOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{cameraError.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cameraError.description}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={startCamera}>Try again</Button>
                  {cameraError.showOpenButton && (
                    <Button size="sm" variant="outline" onClick={() => openStandalone("/scan")}>
                      <ExternalLink className="w-4 h-4 mr-2" /> Open in new tab
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-slate-50 px-4 text-sm text-slate-400">or</span></div>
          </div>

          <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Upload from device</p>
            <p className="text-xs text-slate-400 mt-1">Select an image or document file</p>
            <input type="file" accept="image/*,application/pdf,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileInput} />
          </label>
        </div>
        }

      {mode === "camera" &&
        <div className="space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full" />
            {/* Scan overlay guides */}
            <div className="absolute inset-4 border-2 border-white/30 rounded-xl pointer-events-none">
              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <Button variant="secondary" size="icon" className="rounded-full w-12 h-12" onClick={cancelAll}>
                <X className="w-5 h-5" />
              </Button>
              <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-105 transition-transform flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-slate-700" />
              </button>
              <div className="w-12 h-12" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
        }

      {mode === "preview" && capturedImage &&
        <div className="space-y-4">
          {fileMime.startsWith("image/") ? (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <img src={capturedImage} alt="Scanned document" className="w-full max-h-[50vh] object-contain bg-slate-50" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-full">{fileName}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">{fileMime || "document"}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div>
              <Label>File Name</Label>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
            <div>
              <Label>Save to Folder</Label>
              <MobileSelect
                value={folderId}
                onValueChange={setFolderId}
                placeholder="Select a folder (optional)"
                options={folders.map((f) => ({ value: f.id, label: f.name }))}
                triggerClassName="w-full" />
              
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="e.g. report-card, grade-10" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={retake} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" /> Retake
            </Button>
            <Button onClick={handleUpload} disabled={uploading} className="flex-1">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : <><Check className="w-4 h-4 mr-2" /> Save Document</>}
            </Button>
          </div>
        </div>
        }
      </div>
    </PageContainer>);

}