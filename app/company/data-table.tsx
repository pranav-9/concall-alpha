"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  STICKY_NAME_CELL,
  STICKY_NAME_HEAD,
  TABLE_CARD_SKY,
  TABLE_SCROLL_HINT,
} from "@/lib/design/shell";
import { cn } from "@/lib/utils";
import React from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Accessible name for the table. Every board renders one of these, so
      without it a screen reader announces several unlabelled tables. */
  ariaLabel?: string;
  /** Column id (accessorKey) to pin left on mobile so the company name stays
      visible while the score columns scroll. Adds a right-edge scroll hint. */
  stickyColId?: string;
  /** Stable per-row identity (e.g. company code). Without it TanStack defaults
      row.id to the array index, so a client sort reorders rows while React
      reuses the same DOM node by index-key and only mutates its href — a tap
      begun on one company can then resolve to whatever row slid under it.
      Keying by identity makes React move the node, not rewrite it. */
  getRowId?: (row: TData, index: number) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  ariaLabel,
  stickyColId,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className={cn(TABLE_CARD_SKY, stickyColId && "relative")}>
      {stickyColId ? <div aria-hidden className={TABLE_SCROLL_HINT} /> : null}
      <Table aria-label={ariaLabel} className="w-full text-sm">
        <TableHeader className="bg-background/70">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-border/35 bg-background/70">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "px-3 py-3 text-foreground",
                      header.column.id === stickyColId && STICKY_NAME_HEAD,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="border-b border-border/45 transition-colors last:border-0 hover:bg-accent/50"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-3 align-middle whitespace-nowrap",
                      cell.column.id === stickyColId && STICKY_NAME_CELL,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
