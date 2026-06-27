import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategories } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { PurchaseForm } from "./PurchaseForm";

export const dynamic = "force-dynamic";

export default async function PurchasePage() {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") return <NoAccess role={user?.role ?? "unknown"} />;
  const categories = getCategories();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to inventory
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Supplier Purchase</h1>
        <p className="text-sm text-gray-500">Add bought stock to inventory in one entry. Barcodes auto-generate.</p>
      </div>
      <PurchaseForm categories={categories} />
    </div>
  );
}
