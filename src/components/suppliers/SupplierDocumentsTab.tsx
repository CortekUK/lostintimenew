import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupplierDocuments, useUploadSupplierDocument, useDeleteSupplierDocument } from '@/hooks/useSupplierDocuments';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { Upload, FileText, Trash2 } from 'lucide-react';

interface SupplierDocumentsTabProps {
  supplierId: number;
}

export function SupplierDocumentsTab({ supplierId }: SupplierDocumentsTabProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('other');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  
  const { data: documents, isLoading } = useSupplierDocuments(supplierId);
  const isOwner = useOwnerGuard();
  const uploadMutation = useUploadSupplierDocument();
  const deleteMutation = useDeleteSupplierDocument();

  const documentsByType = documents?.reduce((acc, doc) => {
    const type = doc.doc_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadMutation.mutateAsync({
      supplierId,
      file: selectedFile,
      title,
      docType,
      note,
    });

    setUploadDialogOpen(false);
    setSelectedFile(null);
    setTitle('');
    setNote('');
    setDocType('other');
  };

  const handleDelete = async (documentId: number, filePath: string) => {
    await deleteMutation.mutateAsync({ documentId, filePath });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-luxury">Supplier Documents</h3>
          <p className="text-sm text-muted-foreground">
            Manage agreements, invoices, and related documents
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Documents */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading documents...</p>
          </CardContent>
        </Card>
      ) : !documents || documents.length === 0 ? (
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents using the button above
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(documentsByType || {}).map(([type, docs]) => (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-luxury capitalize">
                    {type.replace('_', ' ')}
                  </CardTitle>
                  <Badge variant="secondary">{docs.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {docs.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                            {doc.note && (
                              <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                                {doc.note}
                              </p>
                            )}
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id, doc.file_path)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Supplier Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="flex-1"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
