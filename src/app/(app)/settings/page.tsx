import { getSettings, getTaxRules, getUsers } from "@/lib/queries";
import { getCurrentUser, can, getEffectiveAccess, ALL_AREAS, STAFF_ROLES } from "@/lib/auth";
import { listBackups } from "@/lib/backup";
import { NoAccess } from "@/components/NoAccess";
import { ShopProfileForm } from "./ShopProfileForm";
import { TaxRulesManager } from "./TaxRulesManager";
import { IntlRateSettings } from "./IntlRateSettings";
import { HardwareSettings } from "./HardwareSettings";
import { UsersManager } from "./UsersManager";
import { RolePermissions } from "./RolePermissions";
import { BackupManager } from "./BackupManager";
import { ResetData } from "./ResetData";
import { ChangePassword } from "./ChangePassword";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "settings")) return <NoAccess role={user?.role ?? "unknown"} />;

  const settings = getSettings();
  const taxRules = getTaxRules();
  const isOwner = user?.role === "owner";
  const users = isOwner ? getUsers() : [];
  const backups = isOwner ? listBackups() : [];
  const roleAccess = isOwner
    ? Object.fromEntries(STAFF_ROLES.map((r) => [r, getEffectiveAccess(r)]))
    : {};

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">
          Shop profile, tax rules &amp; users. <span className="urdu">ترتیبات</span>
        </p>
      </div>

      <ShopProfileForm initial={settings} />
      <ChangePassword />
      <TaxRulesManager initial={taxRules} />
      <IntlRateSettings initial={settings} />
      {isOwner ? (
        <>
          <HardwareSettings initial={settings} />
          <UsersManager initial={users} currentUserId={user!.id} />
          <RolePermissions areas={ALL_AREAS} roles={[...STAFF_ROLES]} initial={roleAccess} />
          <BackupManager initial={backups} />
          <ResetData />
        </>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 text-sm text-gray-500">
          User management &amp; backups are available to the shop owner only.
        </div>
      )}
    </div>
  );
}
