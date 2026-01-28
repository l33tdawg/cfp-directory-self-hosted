'use client';

/**
 * Plugin Upload Dialog
 *
 * Allows admins to upload plugin archives (.zip, .tar.gz, .tgz)
 * with drag-and-drop support and conflict resolution.
 */

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileArchive, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const ACCEPTED_EXTENSIONS = ['.zip', '.tar.gz', '.tgz'];

function isValidFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function PluginUploadDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Conflict resolution state
  const [showConflict, setShowConflict] = useState(false);
  const [conflictPlugin, setConflictPlugin] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setError(null);
    setUploading(false);
    setDragOver(false);
    setShowConflict(false);
    setConflictPlugin(null);
  }, []);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset();
      }
    },
    [reset]
  );

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!isValidFile(selectedFile)) {
      setError('Invalid file type. Accepted: .zip, .tar.gz, .tgz');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const uploadFile = useCallback(
    async (force = false) => {
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (force) {
          formData.append('force', 'true');
        }

        const response = await fetch('/api/admin/plugins/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.status === 409 && data.exists) {
          // Plugin already exists - show conflict dialog
          setConflictPlugin(data.existingPlugin);
          setShowConflict(true);
          setUploading(false);
          return;
        }

        if (!response.ok) {
          setError(data.error || 'Upload failed');
          setUploading(false);
          return;
        }

        toast.success(
          `Plugin "${data.plugin?.displayName || data.plugin?.name}" installed successfully`
        );
        setOpen(false);
        reset();
        router.refresh();
      } catch {
        setError('Network error. Please try again.');
        setUploading(false);
      }
    },
    [file, router, reset]
  );

  const handleUpload = useCallback(() => {
    uploadFile(false);
  }, [uploadFile]);

  const handleForceUpload = useCallback(() => {
    setShowConflict(false);
    setConflictPlugin(null);
    uploadFile(true);
  }, [uploadFile]);

  const handleConflictCancel = useCallback(() => {
    setShowConflict(false);
    setConflictPlugin(null);
    setUploading(false);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Plugin
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Plugin</DialogTitle>
            <DialogDescription>
              Upload a plugin archive (.zip or .tar.gz) to install it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.tar.gz,.tgz"
                onChange={handleInputChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileArchive className="h-8 w-8 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError(null);
                    }}
                    className="ml-2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <>
                  <FileArchive className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Drag and drop a plugin archive here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts .zip, .tar.gz, .tgz (max 50MB)
                  </p>
                </>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Install Plugin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict resolution dialog */}
      <AlertDialog open={showConflict} onOpenChange={setShowConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plugin Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              The plugin &quot;{conflictPlugin}&quot; is already installed.
              Would you like to overwrite it? This will replace the existing
              plugin files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConflictCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleForceUpload}>
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
