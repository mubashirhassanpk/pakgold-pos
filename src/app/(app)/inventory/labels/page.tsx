import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInventory, getSettings } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { LabelSheet } from "./LabelSheet";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") return <NoAccess role={user?.role ?? "unknown"} />;

  const items = getInventory().map((it) => ({
    id: it.id,
    barcode: it.barcode ?? "",
    nameEn: it.nameEn,
    karat: it.karat,
    netWeight: it.netWeight,
  }));
  const shopName = getSettings().shop_name_en || "PakGold";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link href="/inventory" className="no-print inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to inventory
      </Link>
      <div className="no-print">
        <h1 className="text-2xl font-bold">Print Barcode Labels</h1>
        <p className="text-sm text-gray-500">Select items and print a sheet of Code-128 labels for your label printer.</p>
      </div>
      <LabelSheet items={items} shopName={shopName} />
    </div>
  );
}
