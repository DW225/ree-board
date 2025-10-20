import { boardTable, linksTable, userTable } from "@/db/schema";
import type { Role } from "@/lib/constants/role";
import { MS_PER_HOUR, MS_PER_MINUTE } from "@/lib/constants/time";
import type { Board } from "@/lib/types/board";
import type { Link, LinkWithCreator } from "@/lib/types/link";
import type { User } from "@/lib/types/user";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

/**
 * Creates a new magic link for a board
 * @param boardId - The ID of the board to create the link for
 * @param role - The role to assign to users who join via this link
 * @param creatorId - The ID of the user creating the link
 * @param expirationHours - Number of hours until expiration, or 0 for never expires (default: 0)
 */
export async function createMagicLink(
  boardId: Board["id"],
  role: Role,
  creatorId: User["id"],
  expirationHours: number = 0
): Promise<Link> {
  // Generate unique token (pre-checks DB for uniqueness)
  const token = await generateUniqueToken();
  const expiresAt =
    expirationHours > 0
      ? new Date(Date.now() + expirationHours * MS_PER_HOUR)
      : null;

  const [link] = await db
    .insert(linksTable)
    .values({
      boardId,
      token,
      role,
      creator: creatorId,
      expiresAt,
    })
    .returning();

  return link;
}

/**
 * Prepared statement for fetching links by board ID with creator info
 */
const prepareFetchLinksByBoardId = db
  .select({
    id: linksTable.id,
    boardId: linksTable.boardId,
    token: linksTable.token,
    role: linksTable.role,
    createdAt: linksTable.createdAt,
    creator: linksTable.creator,
    expiresAt: linksTable.expiresAt,
    creatorName: userTable.name,
  })
  .from(linksTable)
  .leftJoin(userTable, eq(linksTable.creator, userTable.id))
  .where(eq(linksTable.boardId, sql.placeholder("boardId")))
  .orderBy(desc(linksTable.createdAt))
  .prepare();

/**
 * Fetches all magic links for a board with creator information
 */
export async function fetchLinksByBoardId(
  boardId: Board["id"]
): Promise<LinkWithCreator[]> {
  const links = await prepareFetchLinksByBoardId.execute({ boardId });

  return links.map((link) => ({
    ...link,
    creatorName: link.creatorName || undefined,
    isExpired: link.expiresAt ? new Date() > link.expiresAt : false,
    expiresIn: getTimeUntilExpiration(link.expiresAt),
  }));
}

/**
 * Prepared statement for finding a link by token
 */
const prepareFindLinkByToken = db
  .select()
  .from(linksTable)
  .where(eq(linksTable.token, sql.placeholder("token")))
  .limit(1)
  .prepare();

/**
 * Finds a magic link by its token
 */
export async function findLinkByToken(token: string): Promise<Link | null> {
  const results = await prepareFindLinkByToken.execute({ token });
  return results[0] || null;
}

/**
 * Prepared statement for revoking a magic link
 */
const prepareRevokeMagicLink = db
  .delete(linksTable)
  .where(
    and(
      eq(linksTable.id, sql.placeholder("linkId")),
      eq(linksTable.boardId, sql.placeholder("boardId"))
    )
  )
  .prepare();

/**
 * Revokes (deletes) a magic link
 */
export async function revokeMagicLink(
  linkId: number,
  boardId: Board["id"]
): Promise<void> {
  await prepareRevokeMagicLink.execute({ linkId, boardId });
}

/**
 * Prepared statement for checking if a link exists and is valid
 */
const prepareFindValidLinkByToken = db
  .select({
    id: linksTable.id,
    boardId: linksTable.boardId,
    token: linksTable.token,
    role: linksTable.role,
    createdAt: linksTable.createdAt,
    creator: linksTable.creator,
    expiresAt: linksTable.expiresAt,
    boardTitle: boardTable.title,
  })
  .from(linksTable)
  .innerJoin(boardTable, eq(linksTable.boardId, boardTable.id))
  .where(eq(linksTable.token, sql.placeholder("token")))
  .limit(1)
  .prepare();

/**
 * Finds a valid (non-expired) magic link by token with board info
 */
export async function findValidLinkByToken(token: string) {
  const results = await prepareFindValidLinkByToken.execute({ token });
  const link = results[0];

  if (!link) {
    return null;
  }

  // Check if expired
  if (link.expiresAt && new Date() > link.expiresAt) {
    return null;
  }

  return link;
}

/**
 * Deletes all expired magic links (cleanup function)
 */
export async function cleanupExpiredLinks(): Promise<number> {
  const result = await db
    .delete(linksTable)
    .where(
      and(
        lt(linksTable.expiresAt, new Date()),
        // Only delete links that actually have an expiration date
        sql`${linksTable.expiresAt} IS NOT NULL`
      )
    )
    .returning();

  return result.length || 0;
}

/**
 * Prepared statement for getting link count by board
 */
const prepareLinkCountByBoard = db
  .select({
    count: sql<number>`COUNT(*)`.as("count"),
  })
  .from(linksTable)
  .where(eq(linksTable.boardId, sql.placeholder("boardId")))
  .prepare();

/**
 * Gets the count of magic links for a board
 */
export async function getLinkCountByBoard(
  boardId: Board["id"]
): Promise<number> {
  const result = await prepareLinkCountByBoard.execute({ boardId });
  return result[0]?.count || 0;
}

/**
 * Prepared statement for checking if a token already exists
 */
const prepareCheckTokenExists = db
  .select({ id: linksTable.id })
  .from(linksTable)
  .where(eq(linksTable.token, sql.placeholder("token")))
  .limit(1)
  .prepare();

/**
 * Checks if a token already exists (for ensuring uniqueness)
 */
export async function checkTokenExists(token: string): Promise<boolean> {
  const result = await prepareCheckTokenExists.execute({ token });
  return result.length > 0;
}

/**
 * Generates a unique token for magic links
 */
export async function generateUniqueToken(): Promise<string> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = nanoid(24); // 24-character nanoid as token
    const exists = await checkTokenExists(token);
    if (!exists) {
      return token;
    }
  }
  throw new Error("Failed to generate unique token after multiple attempts");
}

/**
 * Helper to format time unit with proper pluralization
 */
function formatTimeUnit(value: number, unit: string): string {
  return `${value} ${unit}${value > 1 ? "s" : ""}`;
}

/**
 * Helper to calculate time units from milliseconds
 */
function calculateTimeUnits(milliseconds: number) {
  const minutes = Math.floor(milliseconds / MS_PER_MINUTE);
  const hours = Math.floor(milliseconds / MS_PER_HOUR);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  return { months, weeks, days, hours, minutes };
}

/**
 * Helper function to calculate human-readable time until expiration
 */
function getTimeUntilExpiration(expiresAt: Date | null): string {
  if (!expiresAt) {
    return "never";
  }

  const timeLeft = expiresAt.getTime() - Date.now();

  if (timeLeft <= 0) {
    return "expired";
  }

  const { months, weeks, days, hours, minutes } = calculateTimeUnits(timeLeft);

  if (months > 0) return formatTimeUnit(months, "month");
  if (weeks > 0) return formatTimeUnit(weeks, "week");
  if (days > 0) return formatTimeUnit(days, "day");
  if (hours > 0) return formatTimeUnit(hours, "hour");
  if (minutes > 0) return formatTimeUnit(minutes, "minute");

  return "less than a minute";
}

/**
 * Helper function to format magic link URL
 */
export function formatMagicLinkUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    (globalThis.window !== undefined
      ? globalThis.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "");
  return `${base}/invite/${token}`;
}
