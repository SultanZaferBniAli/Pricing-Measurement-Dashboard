import { collection, newId, type UsageEvent } from "../db/store";

export function logUsage(e: Omit<UsageEvent, "id" | "at">) {
  // Fire and forget: a failed usage write must never fail the user's request.
  collection("usage")
    .insert({ id: newId("use"), at: new Date().toISOString(), ...e })
    .catch((err) => console.error(JSON.stringify({ level: "error", msg: "usage log failed", error: (err as Error).message })));
}
