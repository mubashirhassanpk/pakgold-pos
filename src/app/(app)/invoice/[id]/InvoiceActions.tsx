"use client";

import { Printer, MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Build a wa.me link with a prefilled invoice summary. */
function whatsappUrl(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  let num = digits;
  if (digits.startsWith("0")) num = "92" + digits.slice(1); // PK local -> intl
  const base = num ? `https://wa.me/${num}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function InvoiceActions({
  phone,
  summary,
}: {
  phone: string | null;
  summary: string;
}) {
  return (
    <div className="no-print flex items-center justify-between mb-4 max-w-[210mm] mx-auto">
      <Link href="/pos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to POS
      </Link>
      <div className="flex gap-2">
        <a
          href={whatsappUrl(phone, summary)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-success text-white px-4 py-2 text-sm font-semibold hover:brightness-105"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800"
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>
    </div>
  );
}
