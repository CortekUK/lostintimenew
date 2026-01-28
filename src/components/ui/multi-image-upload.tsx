import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MediaUpload } from '@/components/ui/media-upload';
import { X, Plus, Image as ImageIcon, Star, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

// Helper to detect if a URL is a video
export function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}

export function MultiImageUpload({
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false
}: MultiImageUploadProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleMediaUpload = (mediaUrl: string) => {
    if (uploadingIndex !== null) {
      // Replace existing media
      const newImages = [...images];
      newImages[uploadingIndex] = mediaUrl;
      onImagesChange(newImages);
    } else {
      // Add new media
      onImagesChange([...images, mediaUrl]);
    }
    setUploadingIndex(null);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const setAsFavorite = (index: number) => {
    if (index === 0) return; // Already favorite
    const newImages = [...images];
    const [selected] = newImages.splice(index, 1);
    newImages.unshift(selected);
    onImagesChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Media Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((mediaUrl, index) => {
            const isVideo = isVideoUrl(mediaUrl);
            const isFavorite = index === 0;

            return (
              <div key={index} className="relative group">
                <div className={cn(
                  "aspect-square rounded-lg border overflow-hidden bg-muted",
                  isFavorite ? "border-primary border-2" : "border-border"
                )}>
                  {isVideo ? (
                    <div className="relative w-full h-full">
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Video className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={`Product media ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Favorite badge */}
                {isFavorite && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Primary
                    </div>
                  </div>
                )}

                {!disabled && (
                  <>
                    {/* Remove button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Favorite/Replace buttons */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {!isFavorite && !isVideo && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setAsFavorite(index)}
                          title="Set as primary image"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setUploadingIndex(index)}
                      >
                        Replace
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Area */}
      {!disabled && (uploadingIndex !== null || canAddMore) && (
        <div className="border-2 border-dashed border-border rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-2">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <Video className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {uploadingIndex !== null ? 'Replace Media' : 'Add Product Media'}
              </p>
              <p className="text-xs text-muted-foreground">
                {uploadingIndex !== null
                  ? 'Upload a new image or video to replace the selected one'
                  : `Upload up to ${maxImages} images/videos. Videos up to 50MB.`
                }
              </p>
            </div>

            <MediaUpload
              value=""
              onChange={handleMediaUpload}
              onRemove={() => {}}
            />

            {uploadingIndex !== null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadingIndex(null)}
              >
                Cancel Replace
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload More Button */}
      {!disabled && images.length > 0 && canAddMore && uploadingIndex === null && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setUploadingIndex(null)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add More Media ({images.length}/{maxImages})
        </Button>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        First image will be used as the primary product photo. Videos cannot be set as primary.
      </p>
    </div>
  );
}
