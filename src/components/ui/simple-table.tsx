import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  width?: number;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface SimpleTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  showPagination?: boolean;
  pageSize?: number;
}

export function SimpleTable<T>({
  data,
  columns,
  className,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  showPagination = true,
  pageSize = 50
}: SimpleTableProps<T>) {
  const [isDense, setIsDense] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = typeof sortConfig.key === 'string' && sortConfig.key.includes('.') 
        ? sortConfig.key.split('.').reduce((obj, key) => obj?.[key], a)
        : a[sortConfig.key as keyof T];
      
      const bValue = typeof sortConfig.key === 'string' && sortConfig.key.includes('.') 
        ? sortConfig.key.split('.').reduce((obj, key) => obj?.[key], b)
        : b[sortConfig.key as keyof T];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    setSortConfig(current => {
      if (current?.key === column.key) {
        if (current.direction === 'asc') {
          return { key: column.key, direction: 'desc' };
        } else {
          return null; // Remove sorting
        }
      }
      return { key: column.key, direction: 'asc' };
    });
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    
    if (sortConfig?.key === column.key) {
      return sortConfig.direction === 'asc' ? 
        <ChevronUp className="h-4 w-4 ml-1" /> : 
        <ChevronDown className="h-4 w-4 ml-1" />;
    }
    
    return <ChevronUp className="h-4 w-4 ml-1 opacity-30" />;
  };

  if (loading) {
    return (
      <div className={cn('border border-border rounded-lg', className)}>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className={cn('border border-border rounded-lg', className)}>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      {/* Controls */}
      <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {sortedData.length} items total
          {showPagination && totalPages > 1 && (
            <span> • Page {currentPage + 1} of {totalPages}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="dense-mode" className="text-sm">Dense</Label>
          <Switch
            id="dense-mode"
            checked={isDense}
            onCheckedChange={setIsDense}
          />
        </div>
      </div>

      {/* Table with synchronized scroll - single container for both axes */}
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: columns.reduce((sum, col) => sum + (col.width || 150), 0) }}>
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            <tr className="border-b">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-4 py-3 font-medium text-sm border-r last:border-r-0 whitespace-nowrap',
                    column.sortable ? 'cursor-pointer hover:bg-muted/50' : '',
                    column.align === 'right' ? 'text-right' :
                    column.align === 'center' ? 'text-center' : 'text-left'
                  )}
                  style={{ width: column.width || 150, minWidth: column.width || 150 }}
                  onClick={() => handleSort(column)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    column.align === 'right' ? 'justify-end' :
                    column.align === 'center' ? 'justify-center' : 'justify-start'
                  )}>
                    <span className="truncate">{column.title}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {/* Body */}
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  'border-b hover:bg-muted/50 transition-colors',
                  isDense ? 'text-sm' : '',
                  onRowClick ? 'cursor-pointer' : ''
                )}
                onClick={() => onRowClick?.(row, index)}
              >
                {columns.map((column, colIndex) => {
                  const value = typeof column.key === 'string' && column.key.includes('.')
                    ? column.key.split('.').reduce((obj, key) => obj?.[key], row)
                    : row[column.key as keyof T];

                  const content = column.render ? column.render(value, row, index) : String(value || '');

                  return (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-4 py-2',
                        column.align === 'right' ? 'text-right' :
                        column.align === 'center' ? 'text-center' : 'text-left'
                      )}
                      style={{ width: column.width || 150, minWidth: column.width || 150 }}
                    >
                      <div className="truncate">{content}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="p-4 border-t border-border bg-muted/50 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}