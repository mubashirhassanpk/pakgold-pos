/**
 * PakGold POS — Database schema (Drizzle ORM / SQLite).
 *
 * Money is stored as REAL (rupees). Weights are stored in GRAMS (REAL) — the
 * single internal unit. Timestamps are unix millis (integer) for easy sorting.
 */
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

// --- Users & roles -----------------------------------------------------------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  // owner | manager | salesman | accountant
  role: text("role").notNull().default("salesman"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Login sessions (cookie sid -> user) ------------------------------------
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // random session token stored in the cookie
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Shop profile / settings (single-row key-value) --------------------------
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

// --- Gold rates (history kept; latest per purity is "current") ---------------
export const goldRates = sqliteTable("gold_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  karat: integer("karat").notNull(), // 24, 22, 21, 18, or custom
  purityFactor: real("purity_factor").notNull(), // e.g. 0.916
  sellPerTola: real("sell_per_tola").notNull(),
  buyPerTola: real("buy_per_tola").notNull(),
  source: text("source").notNull().default("manual"), // manual | api
  effectiveAt: integer("effective_at").notNull().default(now),
  createdBy: integer("created_by").references(() => users.id),
});

// --- Silver (Chandi) rates ---------------------------------------------------
/**
 * Silver is priced off its own rate, kept separate from gold. Chandi is quoted
 * BOTH per tola and per kg in Pakistani markets, so we store the canonical
 * per-tola rate (sell/buy) and a per-kg rate alongside it. `fineness` is the
 * millesimal grade this row is quoted for (999 = pure). History is preserved
 * exactly like gold_rates — latest row per fineness is "current".
 */
export const silverRates = sqliteTable("silver_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fineness: integer("fineness").notNull().default(999), // 999, 925, …
  purityFactor: real("purity_factor").notNull().default(0.999), // e.g. 0.925
  sellPerTola: real("sell_per_tola").notNull(),
  buyPerTola: real("buy_per_tola").notNull(),
  sellPerKg: real("sell_per_kg").notNull().default(0),
  buyPerKg: real("buy_per_kg").notNull().default(0),
  source: text("source").notNull().default("manual"), // manual | api
  effectiveAt: integer("effective_at").notNull().default(now),
  createdBy: integer("created_by").references(() => users.id),
});

// --- Inventory ---------------------------------------------------------------
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameEn: text("name_en").notNull(),
  nameUr: text("name_ur"),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barcode: text("barcode").unique(),
  nameEn: text("name_en").notNull(),
  nameUr: text("name_ur"),
  categoryId: integer("category_id").references(() => categories.id),
  // Metal discriminator. "gold" uses `karat`; "silver" uses `silverPurity`.
  metal: text("metal").notNull().default("gold"), // gold | silver
  karat: integer("karat").notNull().default(22),
  // Silver fineness (millesimal, e.g. 925). Used when metal = "silver".
  silverPurity: integer("silver_purity"), // null for gold
  grossWeight: real("gross_weight").notNull().default(0), // grams (incl. stones)
  netWeight: real("net_weight").notNull().default(0), // grams of pure-ish gold billed
  makingType: text("making_type").notNull().default("per_gram"), // per_gram|fixed|percent
  makingValue: real("making_value").notNull().default(0),
  wastageType: text("wastage_type").notNull().default("charge_pct"),
  wastageValue: real("wastage_value").notNull().default(0),
  stonesValue: real("stones_value").notNull().default(0),
  otherCharges: real("other_charges").notNull().default(0),
  hallmark: text("hallmark"),
  // Hallmark / purity certificate (PCSIR, SGS, etc.) — printed on the invoice.
  hallmarkLab: text("hallmark_lab"), // e.g. PCSIR, SGS, Bureau Veritas
  certNo: text("cert_no"), // hallmark / assay certificate number
  certDate: text("cert_date"), // YYYY-MM-DD
  costPrice: real("cost_price").notNull().default(0),
  supplier: text("supplier"),
  imagePath: text("image_path"),
  quantity: integer("quantity").notNull().default(1), // pieces in stock
  status: text("status").notNull().default("in_stock"), // in_stock|sold|melted
  createdAt: integer("created_at").notNull().default(now),
});

// --- Customers ---------------------------------------------------------------
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  cnic: text("cnic"), // required for high-value sales (FBR)
  address: text("address"),
  notes: text("notes"),
  balance: real("balance").notNull().default(0), // outstanding credit (+ = owes us)
  createdAt: integer("created_at").notNull().default(now),
});

// --- Tax rules (configurable; basis is enum, rate lives in DB) ----------------
export const taxRules = sqliteTable("tax_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  basis: text("basis").notNull().default("making_only"),
  ratePct: real("rate_pct"),
  fixedAmount: real("fixed_amount"),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
});

// --- Sales -------------------------------------------------------------------
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNo: text("invoice_no").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  userId: integer("user_id").references(() => users.id),
  goldValueTotal: real("gold_value_total").notNull().default(0),
  makingTotal: real("making_total").notNull().default(0),
  wastageTotal: real("wastage_total").notNull().default(0),
  otherTotal: real("other_total").notNull().default(0),
  subtotal: real("subtotal").notNull().default(0),
  taxTotal: real("tax_total").notNull().default(0),
  discount: real("discount").notNull().default(0),
  oldGoldTotal: real("old_gold_total").notNull().default(0),
  grandTotal: real("grand_total").notNull().default(0),
  paidTotal: real("paid_total").notNull().default(0),
  status: text("status").notNull().default("completed"), // completed|held|void
  createdAt: integer("created_at").notNull().default(now),
});

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => inventoryItems.id), // null for custom sale
  type: text("type").notNull().default("item"), // item | custom
  description: text("description").notNull(),
  metal: text("metal").notNull().default("gold"), // gold | silver
  karat: integer("karat").notNull().default(22),
  silverPurity: integer("silver_purity"), // millesimal fineness when metal=silver
  weightGrams: real("weight_grams").notNull().default(0),
  ratePerTola: real("rate_per_tola").notNull().default(0),
  goldValue: real("gold_value").notNull().default(0), // metal value (gold OR silver)
  making: real("making").notNull().default(0),
  wastage: real("wastage").notNull().default(0),
  other: real("other").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
  lineTotal: real("line_total").notNull().default(0),
});

export const oldGoldItems = sqliteTable("old_gold_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }),
  metal: text("metal").notNull().default("gold"), // gold | silver
  weightGrams: real("weight_grams").notNull().default(0),
  karat: integer("karat").notNull().default(22),
  silverPurity: integer("silver_purity"),
  buyRatePerTola: real("buy_rate_per_tola").notNull().default(0),
  value: real("value").notNull().default(0),
  notes: text("notes"), // "touch" / purity test remarks
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }),
  method: text("method").notNull().default("cash"), // cash|card|jazzcash|easypaisa|bank|credit
  amount: real("amount").notNull().default(0),
  reference: text("reference"),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Repair / Job-work (alteration, polish, stone setting, resize) -----------
export const repairJobs = sqliteTable("repair_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobNo: text("job_no").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone"),
  itemDescription: text("item_description").notNull(),
  jobType: text("job_type").notNull().default("repair"), // alteration|polish|stone_setting|resize|repair|other
  karat: integer("karat"),
  metalWeight: real("metal_weight").notNull().default(0), // gold given by customer (g)
  estimatedCharge: real("estimated_charge").notNull().default(0),
  advance: real("advance").notNull().default(0),
  status: text("status").notNull().default("received"), // received|in_progress|ready|delivered|cancelled
  expectedDate: text("expected_date"), // YYYY-MM-DD
  notes: text("notes"),
  karigarId: integer("karigar_id"), // assigned craftsman (FK to karigars; see karigarLedger)
  saleId: integer("sale_id").references(() => sales.id), // set when delivered & billed
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
  deliveredAt: integer("delivered_at"),
});

// --- Held bills (park & recall an in-progress sale) --------------------------
export const heldBills = sqliteTable("held_bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  payload: text("payload").notNull(), // JSON snapshot of the POS cart
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Buy Old Gold (standalone purchase voucher, not tied to a sale) ----------
export const oldGoldPurchases = sqliteTable("old_gold_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  voucherNo: text("voucher_no").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  phone: text("phone"),
  totalWeight: real("total_weight").notNull().default(0), // grams
  totalValue: real("total_value").notNull().default(0),
  paid: real("paid").notNull().default(0),
  method: text("method").notNull().default("cash"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active | void
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

export const oldGoldPurchaseItems = sqliteTable("old_gold_purchase_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => oldGoldPurchases.id, { onDelete: "cascade" }),
  metal: text("metal").notNull().default("gold"), // gold | silver
  weightGrams: real("weight_grams").notNull().default(0),
  karat: integer("karat").notNull().default(22),
  silverPurity: integer("silver_purity"),
  buyRatePerTola: real("buy_rate_per_tola").notNull().default(0),
  value: real("value").notNull().default(0),
  notes: text("notes"),
  // Set when this purchased piece has been pushed into sellable stock.
  inventoryItemId: integer("inventory_item_id"),
});

// --- Karigar (craftsmen / staff) + ledger (dehari, salary, commission) -------
export const karigars = sqliteTable("karigars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  cnic: text("cnic"),
  role: text("role").notNull().default("karigar"), // karigar | polisher | salesman | staff
  wageType: text("wage_type").notNull().default("monthly"), // monthly | dehari | commission | mixed
  monthlySalary: real("monthly_salary").notNull().default(0),
  dehariRate: real("dehari_rate").notNull().default(0), // per-day wage
  commissionPct: real("commission_pct").notNull().default(0), // % of job value
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
});

/**
 * Karigar ledger. `kind` drives the sign:
 *   earnings  (salary, dehari, commission, bonus) → shop OWES karigar (+)
 *   payments  (payout, advance, deduction)        → reduces what's owed (−)
 * Balance payable = Σ earnings − Σ payments.
 */
export const karigarLedger = sqliteTable("karigar_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  karigarId: integer("karigar_id")
    .notNull()
    .references(() => karigars.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // salary|dehari|commission|bonus|payout|advance|deduction
  amount: real("amount").notNull().default(0),
  note: text("note"),
  refType: text("ref_type"), // e.g. repair_job
  refId: text("ref_id"),
  entryDate: integer("entry_date").notNull().default(now),
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Advance Booking / Bayana (custom order, advance now, deliver later) -----
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookingNo: text("booking_no").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone"),
  description: text("description").notNull(), // what to make
  karat: integer("karat"),
  estimatedWeight: real("estimated_weight").notNull().default(0), // grams
  estimatedAmount: real("estimated_amount").notNull().default(0),
  advance: real("advance").notNull().default(0), // bayana taken
  status: text("status").notNull().default("booked"), // booked|in_progress|ready|delivered|cancelled
  expectedDate: text("expected_date"),
  notes: text("notes"),
  karigarId: integer("karigar_id"),
  saleId: integer("sale_id").references(() => sales.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
  deliveredAt: integer("delivered_at"),
});

// --- Suppliers + ledger (payables — what the shop owes suppliers) ------------
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  cnic: text("cnic"),
  notes: text("notes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now),
});

/**
 * Supplier ledger. `kind` drives sign:
 *   purchase, opening → shop OWES supplier more (+)
 *   payment, return   → reduces what's owed (−)
 * Balance payable = Σ(+) − Σ(−).
 */
export const supplierLedger = sqliteTable("supplier_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // purchase|opening|payment|return
  amount: real("amount").notNull().default(0),
  note: text("note"),
  entryDate: integer("entry_date").notNull().default(now),
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Expenses / Kharcha ------------------------------------------------------
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull().default("misc"), // rent|utilities|salary|tea|transport|misc...
  amount: real("amount").notNull().default(0),
  note: text("note"),
  method: text("method").notNull().default("cash"), // cash|bank|card
  expenseDate: integer("expense_date").notNull().default(now),
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Audit log (critical for gold trade trust) -------------------------------
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  detail: text("detail"),
  createdAt: integer("created_at").notNull().default(now),
});

// --- Stone & diamond detail (itemised per inventory piece) -------------------
/**
 * Per-stone breakdown for higher-end stock. A single ring can carry many rows
 * (e.g. 1 centre diamond + 12 side diamonds). `value` is the total rupee value
 * for the row (count × per-stone, or carat × ratePerCarat).
 */
export const itemStones = sqliteTable("item_stones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  stoneType: text("stone_type").notNull().default("diamond"), // diamond|ruby|emerald|sapphire|polki|pearl|other
  shape: text("shape"), // round|princess|oval|emerald|pear|marquise|other
  count: integer("count").notNull().default(1),
  caratWeight: real("carat_weight").notNull().default(0), // total carats for this row
  colorGrade: text("color_grade"), // D–Z for diamonds, or a colour name
  clarityGrade: text("clarity_grade"), // FL, VVS1, VS2, SI1 …
  certLab: text("cert_lab"), // GIA, IGI, HRD, PCSIR …
  certNo: text("cert_no"),
  ratePerCarat: real("rate_per_carat").notNull().default(0),
  value: real("value").notNull().default(0), // total rupee value for this row
  notes: text("notes"),
});

// --- Committee / BC (monthly gold-saving or cash-saving scheme) --------------
/**
 * A committee (a.k.a. "BC" / "kameti") is a rotating savings scheme. Each month
 * every member pays an instalment; one member receives the pooled payout that
 * month. For jewellers this is usually GOLD-based (save X grams/month, take a
 * piece at the end) but cash committees are supported too.
 */
export const committees = sqliteTable("committees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // BC-0001
  name: text("name").notNull(),
  type: text("type").notNull().default("gold"), // gold | cash
  totalMonths: integer("total_months").notNull().default(11),
  // For cash committees: monthly rupee instalment. For gold: monthly grams.
  monthlyAmount: real("monthly_amount").notNull().default(0),
  monthlyGrams: real("monthly_grams").notNull().default(0),
  startDate: text("start_date"), // YYYY-MM-DD (first instalment month)
  status: text("status").notNull().default("active"), // active | completed | cancelled
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: integer("created_at").notNull().default(now),
});

export const committeeMembers = sqliteTable("committee_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  committeeId: integer("committee_id")
    .notNull()
    .references(() => committees.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id),
  name: text("name").notNull(),
  phone: text("phone"),
  // Which month number this member is scheduled to receive the pooled payout.
  payoutMonth: integer("payout_month"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
});

/** A single member's instalment for a given month. */
export const committeeInstallments = sqliteTable("committee_installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  committeeId: integer("committee_id")
    .notNull()
    .references(() => committees.id, { onDelete: "cascade" }),
  memberId: integer("member_id")
    .notNull()
    .references(() => committeeMembers.id, { onDelete: "cascade" }),
  monthNo: integer("month_no").notNull(),
  amount: real("amount").notNull().default(0), // rupees paid
  grams: real("grams").notNull().default(0), // grams credited (gold committee)
  ratePerTola: real("rate_per_tola").notNull().default(0), // rate used to convert
  method: text("method").notNull().default("cash"),
  paidAt: integer("paid_at").notNull().default(now),
  userId: integer("user_id").references(() => users.id),
  note: text("note"),
});

/** A pooled payout handed to a member (cash, gold grams, or an item). */
export const committeePayouts = sqliteTable("committee_payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  committeeId: integer("committee_id")
    .notNull()
    .references(() => committees.id, { onDelete: "cascade" }),
  memberId: integer("member_id")
    .notNull()
    .references(() => committeeMembers.id, { onDelete: "cascade" }),
  monthNo: integer("month_no").notNull(),
  amount: real("amount").notNull().default(0),
  grams: real("grams").notNull().default(0),
  method: text("method").notNull().default("cash"), // cash|gold|item|bank
  saleId: integer("sale_id").references(() => sales.id),
  paidAt: integer("paid_at").notNull().default(now),
  userId: integer("user_id").references(() => users.id),
  note: text("note"),
});
