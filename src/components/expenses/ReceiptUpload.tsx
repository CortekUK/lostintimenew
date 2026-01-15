import { useCallback, useState } from 'react';
import { FileUp, File as FileIcon, Image, Trash2, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useReceiptUpload, Receipt } from '@/hooks/useReceiptUpload';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

interface ReceiptUploadProps {
  expenseId?: number;
  onReceiptsChange?: (count: number) => void;
  onStagedFilesChange?: (files: File[]) => void;
}

export function ReceiptUpload({ expenseId, onReceiptsChange, onStagedFilesChange }: ReceiptUploadProps) {
  const { receipts, uploadReceipt, deleteReceipt, isUploading, uploadProgress, getSignedUrl } =
    useReceiptUpload(expenseId);
  const [dragActive, setDragActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const addStagedFiles = useCallback((files: File[]) => {
    const newStaged = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.includes('pdf') ? 'pdf' : 'image'
    }));
    setStagedFiles(prev => {
      const updated = [...prev, ...newStaged].slice(0, 5);
      onStagedFilesChange?.(updated.map(s => s.file));
      return updated;
    });
  }, [onStagedFilesChange]);

  const removeStagedFile = useCallback((id: string) => {
    setStagedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      onStagedFilesChange?.(updated.map(s => s.file));
      return updated;
    });
  }, [onStagedFilesChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      
      if (expenseId) {
        // Upload directly if expense exists
        files.forEach((file) => {
          uploadReceipt({ expenseId, file });
        });
      } else {
        // Stage files for later upload
        addStagedFiles(files);
      }
    },
    [expenseId, uploadReceipt, addStagedFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const files = Array.from(e.target.files);
      
      if (expenseId) {
        files.forEach((file) => {
          uploadReceipt({ expenseId, file });
        });
      } else {
        addStagedFiles(files);
      }
    },
    [expenseId, uploadReceipt, addStagedFiles]
  );

  const handleView = async (receipt: Receipt) => {
    try {
      const url = await getSignedUrl(receipt.file_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to view receipt:', error);
    }
  };

  const handleDownload = async (receipt: Receipt) => {
    try {
      const url = await getSignedUrl(receipt.file_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.file_name;
      a.click();
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return <FileIcon className="h-8 w-8 text-destructive" />;
    return <Image className="h-8 w-8 text-primary" />;
  };

  const totalFiles = receipts.length + stagedFiles.length;

  return (
    <div className="space-y-4">
      {/* Upload Zone - Always show for both create and edit modes */}
      <Card
        className={cn(
          'border-2 border-dashed p-8 text-center transition-colors',
          dragActive && 'border-primary bg-primary/5',
          !dragActive && 'border-border hover:border-primary/50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Drag and drop receipts here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG up to 10MB (max 5 files)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isUploading || totalFiles >= 5}
            onClick={() => document.getElementById('receipt-upload')?.click()}
          >
            Browse Files
          </Button>
          <input
            id="receipt-upload"
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileInput}
            disabled={isUploading || totalFiles >= 5}
          />
        </div>

        {isUploading && (
          <div className="mt-4 space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
          </div>
        )}
      </Card>

      {/* Staged Files (for create mode) */}
      {stagedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Files to Upload ({stagedFiles.length})</h4>
          <p className="text-xs text-muted-foreground">These will be uploaded when you save the expense</p>
          <div className="space-y-2">
            {stagedFiles.map((staged) => (
              <Card key={staged.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{getFileIcon(staged.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{staged.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(staged.size)} • Ready to upload
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStagedFile(staged.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Receipt List (for edit mode) */}
      {receipts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Receipts ({receipts.length})</h4>
          <div className="space-y-2">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{getFileIcon(receipt.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{receipt.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(receipt.file_size)} •{' '}
                      {format(new Date(receipt.uploaded_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(receipt)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(receipt)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(receipt)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receipt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteReceipt(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
