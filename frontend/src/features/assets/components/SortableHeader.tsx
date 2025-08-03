import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
  children: React.ReactNode;
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  children,
  field,
  sortField,
  sortDirection,
  onSort,
}) => {
  const isSorted = sortField === field;

  return (
    <TableHead
      className="transition-colors cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(field)}
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
