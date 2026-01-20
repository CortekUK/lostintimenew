import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Tag, RotateCcw } from 'lucide-react';
import { useSupplierTags, useAddSupplierTag, useRemoveSupplierTag, useResetSupplierTags, DEFAULT_SUPPLIER_TAGS } from '@/hooks/useSupplierTags';

interface SupplierTagsCardProps {
  userRole: string | null;
}

export function SupplierTagsCard({ userRole }: SupplierTagsCardProps) {
  const [newTag, setNewTag] = useState('');
  const { data: supplierTags = [...DEFAULT_SUPPLIER_TAGS], isLoading } = useSupplierTags();
  const addTagMutation = useAddSupplierTag();
  const removeTagMutation = useRemoveSupplierTag();
  const resetTagsMutation = useResetSupplierTags();

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTagMutation.mutate(newTag.trim(), {
        onSuccess: () => setNewTag('')
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    removeTagMutation.mutate(tag);
  };

  const handleReset = () => {
    resetTagsMutation.mutate();
  };

  const isOwner = userRole === 'owner';

  return (
    <Card id="supplier-tags">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Supplier Tags
        </CardTitle>
        <CardDescription>
          Manage the preset tags that appear when adding or editing suppliers. These tags help categorise your suppliers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tags */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tags...</p>
            ) : supplierTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags defined. Add some tags below.</p>
            ) : (
              supplierTags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary"
                  className="gap-1.5 pr-1.5"
                >
                  {tag}
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                      disabled={removeTagMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Add New Tag */}
        {isOwner && (
          <div className="flex gap-2">
            <Input
              placeholder="New tag name..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleAddTag}
              disabled={!newTag.trim() || addTagMutation.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}

        {/* Reset Button */}
        {isOwner && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Reset to default tags ({DEFAULT_SUPPLIER_TAGS.join(', ')})
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetTagsMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {!isOwner && (
          <p className="text-sm text-muted-foreground">
            Only owners can modify supplier tags.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
