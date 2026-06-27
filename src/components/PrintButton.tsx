"use client";

import { Printer } from "lucide-react";

/** Generic "print this page's #print-area" button. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print flex items-center gap-2 rounded-lg bg-navy-900 text-white text-sm px-4 py-2 hover:bg-navy-800"
    >
      <Printer size={16} /> {label}
    </button>
  );
}
