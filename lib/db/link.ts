import { linksTable, userTable, boardTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import type { Link, LinkWithCreator } from "@/lib/types/link";
import type { Role } from "@/lib/constants/role";
import { and, eq, sql, desc, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

/**
 * Creates a new magic link for a board
 */
export async function createMagicLink(
  boardId: Board["id"],
  role: Role,
  creatorId: User["id"],
  expirationHours?: number
): Promise<Link> {
  const token = nanoid(24); // Generate cryptographically secure token
  const expiresAt = expirationHours
    ? new Date(Date.now() + expirationHours * 60 * 60 * 1000)
    : null;

  const [link] = await db.insert(linksTable).values({
    boardId,
    token,
    role,
    creator: creatorId,
    expiresAt,
  }).returning();

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
export async function fetchLinksByBoardId(boardId: Board["id"]): Promise<LinkWithCreator[]> {
  const links = await prepareFetchLinksByBoardId.execute({ boardId });

  return links.map(link => ({
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
    ).returning();

  return result.length || 0;
}

/**
 * Prepared statement for getting link count by board
 */
const prepareLinkCountByBoard = db
  .select({
    count: sql<number>`COUNT(*)`.as('count')
  })
  .from(linksTable)
  .where(eq(linksTable.boardId, sql.placeholder("boardId")))
  .prepare();

/**
 * Gets the count of active magic links for a board
 */
export async function getLinkCountByBoard(boardId: Board["id"]): Promise<number> {
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
  let token: string;
  let attempts = 0;
  const maxAttempts = 5;

  do {
    token = nanoid(24);
    attempts++;

    if (attempts > maxAttempts) {
      throw new Error("Failed to generate unique token after multiple attempts");
    }
  } while (await checkTokenExists(token));

  return token;
}

/**
 * Helper function to calculate human-readable time until expiration
 */
function getTimeUntilExpiration(expiresAt: Date | null): string {
  if (!expiresAt) {
    return "never";
  }

  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();

  if (timeLeft <= 0) {
    return "expired";
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  if (weeks > 0) {
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(timeLeft / (1000 * 60));
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return "less than a minute";
}

/**
 * Helper function to format magic link URL
 */
export function formatMagicLinkUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/invite/${token}`;
}
