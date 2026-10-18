import { collection, newId, type UsageEvent } from "../db/store";

export function logUsage(e: Omit<UsageEvent, "id" | "at">) {
  collection("usage").insert({ id: newId("use"), at: new Date().toISOString(), ...e });
}
