import type { db } from "@/lib/db/client";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
