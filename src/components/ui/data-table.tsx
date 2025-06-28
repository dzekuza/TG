import React, { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  TableBody as TableBodyRaw,
  TableCell as TableCellRaw,
  TableHead as TableHeadRaw,
  TableHeader as TableHeaderRaw,
  Table as TableRaw,
  TableRow as TableRowRaw,
} from './table';
import { cn } from './utils';
import type {
  Cell,
  Column,
  ColumnDef,
  Header,
  HeaderGroup,
  Row,
  SortingState,
  Table,
} from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type TableState = {
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
};

export const useTable = create<TableState>()(
  devtools((set) => ({
    sorting: [],
    setSorting: (sorting: SortingState) => set(() => ({ sorting })),
  }))
);

export const TableContext = createContext<{
  data: unknown[];
  columns: ColumnDef<unknown, unknown>[];
  table: Table<unknown> | null;
}>({
  data: [],
  columns: [],
  table: null,
});

export type TableProviderProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  children: ReactNode;
  className?: string;
};

export function TableProvider<TData, TValue>({
  columns,
  data,
  children,
  className,
}: TableProviderProps<TData, TValue>) {
  const { sorting, setSorting } = useTable();
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      // updater is a function that returns a sorting object
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
    },
    state: {
      sorting,
    },
  });

  return (
    <TableContext.Provider
      value={{
        data,
        columns: columns as never,
        table: table as never,
      }}
    >
      <TableRaw className={className}>{children}</TableRaw>
    </TableContext.Provider>
  );
}

export type TableHeadProps = {
  header: Header<unknown, unknown>;
  className?: string;
};

export function TableHead({ header, className }: TableHeadProps) {
  return (
    <TableHeadRaw colSpan={header.colSpan} className={className}>
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getCanSort() && (
        <Button
          variant="ghost"
          size="icon"
          onClick={header.column.getToggleSortingHandler()}
          className="ml-2"
        >
          {header.column.getIsSorted() === 'asc' ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : header.column.getIsSorted() === 'desc' ? (
            <ArrowDownIcon className="h-4 w-4" />
          ) : (
            <ChevronsUpDownIcon className="h-4 w-4" />
          )}
        </Button>
      )}
    </TableHeadRaw>
  );
}

export type TableRowProps = {
  row: Row<unknown>;
  className?: string;
};

export function TableRow({ row, className }: TableRowProps) {
  return (
    <TableRowRaw className={className} data-state={row.getIsSelected() && 'selected'}>
      {row.getVisibleCells().map((cell) => (
        <TableCellRaw key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCellRaw>
      ))}
    </TableRowRaw>
  );
}

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
};

export function DataTable<TData, TValue>({ columns, data, className }: DataTableProps<TData, TValue>) {
  return (
    <TableProvider columns={columns} data={data} className={className}>
      <TableHeaderRaw>
        {useContext(TableContext).table?.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} header={header} />
            ))}
          </tr>
        ))}
      </TableHeaderRaw>
      <TableBodyRaw>
        {useContext(TableContext).table?.getRowModel().rows.map((row) => (
          <TableRow key={row.id} row={row} />
        ))}
      </TableBodyRaw>
    </TableProvider>
  );
} 