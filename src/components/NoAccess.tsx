import { Lock } from "lucide-react";

export function NoAccess({ role }: { role: string }) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <Lock size={26} />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-gray-500 mt-2">
          Your role (<span className="font-semibold capitalize">{role}</span>) does not have
          permission to view this section. Please contact the shop owner.
        </p>
      </div>
    </div>
  );
}
