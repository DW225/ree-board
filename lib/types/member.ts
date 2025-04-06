import type { memberTable } from "@/db/schema";

export type NewMember = typeof memberTable.$inferInsert;
export type Member = typeof memberTable.$inferSelect;

export interface MemberSignal
  extends Omit<Member, "boardId" | "updatedAt" | "createdAt"> {
  username: string;
  email: string;
}
