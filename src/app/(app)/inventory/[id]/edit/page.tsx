import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCategories, getItem, getItemStones, nextBarcodeNumber } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { ItemForm } from "../../ItemForm";
import type { MakingType, WastageType } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const item = getItem(Number(id));
  if (!item) notFound();
  const categories = getCategories();
  const stones = getItemStones(item.id);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href={`/inventory/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-2xl font-bold">Edit Item</h1>
      <ItemForm
        categories={categories}
        itemId={item.id}
        suggestedBarcode={nextBarcodeNumber()}
        initialStones={stones.map((s) => ({
          stoneType: s.stoneType,
          shape: s.shape ?? "",
          count: s.count,
          caratWeight: s.caratWeight,
          colorGrade: s.colorGrade ?? "",
          clarityGrade: s.clarityGrade ?? "",
          certLab: s.certLab ?? "",
          certNo: s.certNo ?? "",
          ratePerCarat: s.ratePerCarat,
          value: s.value,
          notes: s.notes ?? "",
        }))}
        initial={{
          barcode: item.barcode ?? "",
          nameEn: item.nameEn,
          nameUr: item.nameUr ?? "",
          categoryId: item.categoryId,
          metal: (item.metal ?? "gold") as "gold" | "silver",
          karat: item.karat,
          silverPurity: item.silverPurity ?? null,
          grossWeight: item.grossWeight,
          netWeight: item.netWeight,
          makingType: item.makingType as MakingType,
          makingValue: item.makingValue,
          wastageType: item.wastageType as WastageType,
          wastageValue: item.wastageValue,
          stonesValue: item.stonesValue,
          otherCharges: item.otherCharges,
          hallmark: item.hallmark ?? "",
          hallmarkLab: item.hallmarkLab ?? "",
          certNo: item.certNo ?? "",
          certDate: item.certDate ?? "",
          costPrice: item.costPrice,
          supplier: item.supplier ?? "",
          quantity: item.quantity,
        }}
      />
    </div>
  );
}
