"use client";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Payment = {
  id: string;
  company: string;
  q1fy26: number;
  q4fy25: number;
  q3fy25: number;
  q2fy25: number;
  //   status: "pending" | "processing" | "success" | "failed";
  //   email: string;
};

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "company",
    // header: "Company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "q1fy26",
    // header: "Q1 FY26",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Q1 FY26
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("q1fy26"));
      return (
        <div>
          <ConcallScore score={score}></ConcallScore>
        </div>
      );
    },
  },
  {
    accessorKey: "q4fy25",
    // header: "Q4 FY25",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Q4 FY25
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("q4fy25"));
      return (
        <div>
          <ConcallScore score={score}></ConcallScore>
        </div>
      );
    },
  },
  {
    accessorKey: "q3fy25",
    // header: "Q3 FY25",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Q3 FY25
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("q3fy25"));
      return (
        <div>
          <ConcallScore score={score}></ConcallScore>
        </div>
      );
    },
  },
  {
    accessorKey: "q2fy25",
    // header: "Q2 FY25",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Q2 FY25
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("q2fy25"));

      return (
        <div>
          {/* <Badge
            className="h-12 rounded-full px-1  bg-green-400"
            // variant="destructive"
          >
            <p className="text-lg font-extrabold  text-black">{amount}</p>
          </Badge> */}
          <ConcallScore score={amount}></ConcallScore>
        </div>
      );
    },
  },
];
