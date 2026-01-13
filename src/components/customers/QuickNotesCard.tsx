import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { usePermissions } from '@/hooks/usePermissions';
import { Pencil, Save, X, StickyNote } from 'lucide-react';

interface QuickNotesCardProps {
  customerId: number;
  notes: string | null;
}

export function QuickNotesCard({ customerId, notes }: QuickNotesCardProps) {
  const { canEdit } = usePermissions();
  const updateCustomer = useUpdateCustomer();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes || '');

  const handleSave = async () => {
    await updateCustomer.mutateAsync({
      id: customerId,
      notes: editedNotes.trim() || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedNotes(notes || '');
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditedNotes(notes || '');
    setIsEditing(true);
  };

  return (
    <Card className="md:col-span-2 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          Notes
        </CardTitle>
        {canEdit('customers') && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder="Add notes about this customer..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={updateCustomer.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateCustomer.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateCustomer.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className={`text-sm whitespace-pre-line ${notes ? 'text-foreground' : 'text-muted-foreground'}`}
            onClick={canEdit('customers') ? handleStartEdit : undefined}
            style={{ cursor: canEdit('customers') ? 'pointer' : 'default' }}
          >
            {notes || 'No notes added. Click to add notes...'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
