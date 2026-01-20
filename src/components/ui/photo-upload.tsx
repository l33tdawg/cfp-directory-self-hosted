'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, X, Upload } from 'lucide-react';

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  name: string;
  onPhotoChange: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function PhotoUpload({
  currentPhotoUrl,
  name,
  onPhotoChange,
  size = 'md',
  className = '',
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Upload the file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Update with the server URL
      setPreviewUrl(data.file.url);
      onPhotoChange(data.file.url);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      // Revert to previous photo on error
      setPreviewUrl(currentPhotoUrl || null);
    } finally {
      setIsUploading(false);
      // Clean up object URL
      URL.revokeObjectURL(localPreview);
    }

    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!previewUrl) return;

    // If it's a server URL, we could delete it, but for simplicity
    // we'll just clear it locally and let the parent handle persistence
    setPreviewUrl(null);
    onPhotoChange(null);
    toast.success('Photo removed');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} border-2 border-border`}>
          <AvatarImage src={previewUrl || undefined} alt={name} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {getInitials(name || 'U')}
          </AvatarFallback>
        </Avatar>

        {/* Overlay with camera icon */}
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          className={`
            absolute inset-0 rounded-full bg-black/50 
            flex items-center justify-center 
            opacity-0 group-hover:opacity-100 
            transition-opacity cursor-pointer
            disabled:cursor-not-allowed
          `}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Remove button */}
        {previewUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="
              absolute -top-1 -right-1 
              h-6 w-6 rounded-full 
              bg-destructive text-destructive-foreground 
              flex items-center justify-center
              shadow-md hover:bg-destructive/90
              transition-colors
            "
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {previewUrl ? 'Change Photo' : 'Upload Photo'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        JPEG, PNG, GIF, or WebP. Max 5MB.
      </p>
    </div>
  );
}
