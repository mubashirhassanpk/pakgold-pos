const STYLES: Record<string, string> = {
  booked: "bg-blue-50 text-blue-600",
  received: "bg-blue-50 text-blue-600",
  in_progress: "bg-amber-50 text-amber-600",
  ready: "bg-violet-50 text-violet-600",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STYLES[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
