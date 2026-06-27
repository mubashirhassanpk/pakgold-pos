import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategories, nextBarcodeNumber } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { ItemForm } from "../ItemForm";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") return <NoAccess role={user?.role ?? "unknown"} />;

  const categories = getCategories();
  const suggested = nextBarcodeNumber();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to inventory
      </Link>
      <h1 className="text-2xl font-bold">Add Item</h1>
      <ItemForm categories={categories} suggestedBarcode={suggested} />
    </div>
  );
}
