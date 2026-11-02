const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useParams, Link } from "react-router-dom";
import { FolderPlus, Upload, ChevronRight, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FolderCard from "@/components/files/FolderCard";
import FileCard from "@/components/files/FileCard";
import FileUploadModal from "@/components/files/FileUploadModal";
import CreateFolderModal from "@/components/files/CreateFolderModal";
import MoveFileModal from "@/components/files/MoveFileModal";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Files() {
  const { folderId } = useParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [moveFile, setMoveFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const { toast } = useToast();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["files", folderId],
    queryFn: async () => {
      const [allFolders, allFilesData] = await Promise.all([
        db.entities.Folder.list(),
        db.entities.SchoolFile.list("-created_date", 200),
      ]);
      return { allFolders, allFilesData };
    },
  });

  const allFolders = data?.allFolders ?? [];
  const allFiles = data?.allFilesData ?? [];

  // Derive view state
  let folders = [];
  let files = [];
  let currentFolder = null;
  let breadcrumbs = [];

  if (folderId) {
    currentFolder = allFolders.find((f) => f.id === folderId) || null;
    folders = allFolders.filter((f) => f.parent_folder_id === folderId);
    files = allFiles.filter((f) => f.folder_id === folderId);
    const crumbs = [];
    let current = currentFolder;
    while (current) {
      crumbs.unshift(current);
      current = allFolders.find((f) => f.id === current.parent_folder_id);
    }
    breadcrumbs = crumbs;
  } else {
    folders = allFolders.filter((f) => !f.parent_folder_id);
    files = allFiles.filter((f) => !f.folder_id);
  }

  const getFileCount = (folder) => allFiles.filter((f) => f.folder_id === folder.id).length;

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      if (deleteItem._type === "folder") {
        await db.entities.Folder.delete(deleteItem.id);
        toast({ title: "Folder deleted" });
      } else {
        await db.entities.SchoolFile.delete(deleteItem.id);
        toast({ title: "File deleted" });
      }
      refetch();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteItem(null);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mb-1 overflow-x-auto whitespace-nowrap">
              <Link to="/files" className="hover:text-blue-600 flex items-center gap-1 shrink-0">
                <Home className="w-3.5 h-3.5" /> All Files
              </Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                  <Link to={`/files/folder/${crumb.id}`} className="hover:text-blue-600 shrink-0">{crumb.name}</Link>
                </React.Fragment>
              ))}
            </div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentFolder ? currentFolder.name : "All Files"}
            </h1>
            {isFetching && <p className="text-xs text-slate-400 mt-0.5">Refreshing...</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-2" /> New Folder
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload
            </Button>
          </div>
        </div>

        {/* Folders */}
        {folders.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  fileCount={getFileCount(folder)}
                  onDelete={(f) => setDeleteItem({ ...f, _type: "folder" })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Files {files.length > 0 && `(${files.length})`}
          </h2>
          {files.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
              <Upload className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No files here</p>
              <p className="text-sm text-slate-400 mt-1">Upload files or create folders to organize your records</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={(f) => setDeleteItem(f)}
                  onMove={(f) => setMoveFile(f)}
                  onView={setPreviewFile}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FileUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} folderId={folderId} onSuccess={refetch} />
      <CreateFolderModal open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} parentFolderId={folderId} onSuccess={refetch} />
      {moveFile && <MoveFileModal open={!!moveFile} onClose={() => setMoveFile(null)} file={moveFile} onSuccess={refetch} />}
      <FilePreviewModal open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?._type === "folder" ? "folder" : "file"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteItem?.name}". This action cannot be undone.
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