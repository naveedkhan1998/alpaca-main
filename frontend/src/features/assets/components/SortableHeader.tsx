import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
  children: React.ReactNode;
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  children,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}) => {
  const isSorted = sortField === field;
  const ariaSort: 'ascending' | 'descending' | 'none' = isSorted
    ? sortDirection === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';

  return (
    <TableHead
      aria-sort={ariaSort}
      className={`transition-colors cursor-pointer select-none hover:bg-muted/50 px-4 py-3 ${className || ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSort(field)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(field);
        }
      }}
    >
      <div className="flex items-center gap-2">
        {children}
        {isSorted ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );
};
