import { supabaseRequest } from "./supabase-rest";

const PAGE_SIZE = 500;
const SENSITIVE_FIELD = /(password|pass|(?:^|[_-])pa(?:$|[_-])|token|secret|authorization|credential|api[_-]?key|otp|jwt)/i;

type SafeValue = string | number | boolean | null | SafeValue[] | { [key: string]: SafeValue };

export interface AdminDirectoryUser {
  id: string;
  source: "app" | "telegram" | "mobile";
  name: string;
  details: Record<string, SafeValue>;
  activityAt: string | null;
}

function redact(value: unknown): SafeValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item) ?? null);
  }
  if (typeof value === "object") {
    const safe: Record<string, SafeValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_FIELD.test(key)) continue;
      const safeValue = redact(item);
      if (safeValue !== undefined) safe[key] = safeValue;
    }
    return safe;
  }
  return undefined;
}

async function fetchAllRows<T>(table: string, order: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await supabaseRequest<T[]>(
      `${table}?select=*&order=${order}&limit=${PAGE_SIZE}&offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function toDirectoryUser(
  source: AdminDirectoryUser["source"],
  id: unknown,
  name: unknown,
  row: Record<string, unknown>,
  activityAt: unknown,
): AdminDirectoryUser {
  const safeDetails = redact(row);
  const details = safeDetails && typeof safeDetails === "object" && !Array.isArray(safeDetails)
    ? safeDetails as Record<string, SafeValue>
    : {};
  return {
    id: `${source}:${String(id ?? "unknown")}`,
    source,
    name: typeof name === "string" && name.trim() ? name.trim() : String(id ?? "Unnamed user"),
    details,
    activityAt: typeof activityAt === "string" ? activityAt : null,
  };
}

export async function listAdminDirectoryUsers(): Promise<AdminDirectoryUser[]> {
  const [appRows, telegramRows, mobileRows] = await Promise.all([
    fetchAllRows<Record<string, unknown>>("app_users", "id.asc"),
    fetchAllRows<Record<string, unknown>>("bot_users", "id.asc"),
    fetchAllRows<Record<string, unknown>>("mobile_app_users", "install_id.asc"),
  ]);

  return [
    ...appRows.map((row) => toDirectoryUser("app", row.user_id ?? row.id, row.name, row, row.updated_at ?? row.created_at)),
    ...telegramRows.map((row) => toDirectoryUser(
      "telegram",
      row.telegram_id ?? row.id,
      [row.first_name, row.last_name].filter((part) => typeof part === "string" && part.trim()).join(" "),
      row,
      row.last_seen ?? row.first_seen,
    )),
    ...mobileRows.map((row) => toDirectoryUser(
      "mobile",
      row.install_id ?? row.id,
      row.display_name,
      row,
      row.last_seen ?? row.first_seen,
    )),
  ];
}