import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

export function MediaUpload({ value, onChange, onRemove, disabled }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = IMAGE_EXTENSIONS.includes(fileExt) || file.type.startsWith('image/');
    const isVideo = VIDEO_EXTENSIONS.includes(fileExt) || file.type.startsWith('video/');

    // Validate file type
    if (!isImage && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file (PNG, JPG, WEBP, MP4, MOV, WebM)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size based on type
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeLabel = isVideo ? '50MB' : '5MB';

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Please select a ${isVideo ? 'video' : 'image'} smaller than ${maxSizeLabel}`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
      toast({
        title: "Success",
        description: `${isVideo ? 'Video' : 'Image'} uploaded successfully`
      });
    } catch (error: any) {
      console.error('Error uploading media:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload media",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        // Extract file path from URL
        const url = new URL(value);
        const filePath = url.pathname.split('/').slice(-2).join('/'); // gets "products/filename"

        await supabase.storage
          .from('product-images')
          .remove([filePath]);
      } catch (error) {
        console.error('Error removing media:', error);
      }
    }
    onRemove();
  };

  // Check if current value is a video
  const isVideo = value && VIDEO_EXTENSIONS.some(ext => value.toLowerCase().includes(`.${ext}`));

  // Accept string for file input
  const acceptTypes = [
    ...IMAGE_EXTENSIONS.map(ext => `.${ext}`),
    ...VIDEO_EXTENSIONS.map(ext => `.${ext}`),
    'image/*',
    'video/*'
  ].join(',');

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleUpload}
        disabled={disabled || uploading}
        className="hidden"
      />

      {value ? (
        <div className="relative">
          <div className="relative w-full h-48 rounded-lg border border-dashed border-border overflow-hidden">
            {isVideo ? (
              <video
                src={value}
                controls
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <img
                src={value}
                alt="Product"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="w-full h-48 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <ImageIcon className="h-6 w-6" />
                <Video className="h-6 w-6" />
              </div>
              <Upload className="h-6 w-6" />
              <p className="text-sm font-medium">Click to upload image or video</p>
              <p className="text-xs">Images: PNG, JPG, WEBP up to 5MB</p>
              <p className="text-xs">Videos: MP4, MOV, WebM up to 50MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
