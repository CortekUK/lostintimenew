import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAllExpenseCategories, formatCategoryDisplay } from '@/hooks/useCustomCategories';
import { toast } from 'sonner';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkCategoryChange: (category: string) => Promise<void>;
}

export function BulkActionsToolbar({ 
  selectedCount, 
  onClearSelection, 
  onBulkDelete,
  onBulkCategoryChange 
}: BulkActionsToolbarProps) {
  const { all: allCategories, custom: customCategories } = useAllExpenseCategories();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCategoryChange = async (category: string) => {
    setIsProcessing(true);
    try {
      await onBulkCategoryChange(category);
      toast.success(`Moved ${selectedCount} expense${selectedCount === 1 ? '' : 's'} to ${formatCategoryDisplay(category)}`);
    } catch (error) {
      toast.error('Failed to update expenses');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete();
      toast.success(`Deleted ${selectedCount} expense${selectedCount === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error('Failed to delete expenses');
    } finally {
      setIsProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
          {/* Selection indicator */}
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <Badge variant="default" className="font-semibold px-3 py-1">
              {selectedCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Select 
              value="" 
              onValueChange={handleCategoryChange} 
              disabled={isProcessing}
            >
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="Move to category..." />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      {formatCategoryDisplay(cat)}
                      {customCategories.includes(cat) && (
                        <Badge variant="secondary" className="text-xs ml-1">Custom</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} expense{selectedCount === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} expense{selectedCount === 1 ? '' : 's'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedCount} Expense${selectedCount === 1 ? '' : 's'}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
