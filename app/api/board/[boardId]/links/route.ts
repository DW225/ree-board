import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { checkRoleByKindeID } from "@/lib/db/member";
import { hasRequiredRole, Role } from "@/lib/constants/role";
import {
  createMagicLink,
  fetchLinksByBoardId,
  revokeMagicLink
} from "@/lib/db/link";
import { getUserByKindeID } from "@/lib/db/user";
import type { CreateLinkRequest, RevokeLinkRequest } from "@/lib/types/link";
import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";

/**
 * RBAC helper for magic link API routes
 */
async function checkBoardOwnership(boardId: string) {
  const { getUser, isAuthenticated } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    redirect("/");
  }

  const kindeUser = await getUser();
  if (!kindeUser?.id) {
    return NextResponse.json({ error: "Invalid user session" }, { status: 401 });
  }

  const user = await checkRoleByKindeID(kindeUser.id, boardId);
  if (!user) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!hasRequiredRole(user.role, Role.owner)) {
    return NextResponse.json({ error: "Owner permissions required" }, { status: 403 });
  }

  const fullUser = await getUserByKindeID(kindeUser.id);
  if (!fullUser) {
    return NextResponse.json({ error: "User data not found" }, { status: 500 });
  }

  return fullUser;
}

/**
 * GET /api/board/[boardId]/links
 * Fetches all magic links for a board (owner only)
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;

    // Check ownership - redirects if not authenticated
    const user = await checkBoardOwnership(boardId);
    if (user instanceof NextResponse) return user; // Error response

    const links = await fetchLinksByBoardId(boardId);

    return NextResponse.json({
      links,
      count: links.length
    });
  } catch (error) {
    console.error("Error fetching magic links:", error);
    return NextResponse.json(
      { error: "Failed to fetch magic links" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/board/[boardId]/links
 * Creates a new magic link (owner only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;

    // Check ownership - redirects if not authenticated
    const user = await checkBoardOwnership(boardId);
    if (user instanceof NextResponse) return user; // Error response

    const body: CreateLinkRequest = await request.json();
    const { role, expirationHours } = body;

    // Validate role is either member or guest
    if (role !== Role.member && role !== Role.guest) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    // Validate expiration hours if provided
    if (expirationHours !== undefined && expirationHours !== null) {
      if (typeof expirationHours !== 'number' || expirationHours <= 0) {
        return NextResponse.json(
          { error: "Invalid expiration hours" },
          { status: 400 }
        );
      }
    }

    const newLink = await createMagicLink(
      boardId,
      role,
      user.id,
      expirationHours || undefined
    );

    return NextResponse.json({
      link: newLink,
      success: true
    });
  } catch (error) {
    console.error("Error creating magic link:", error);
    return NextResponse.json(
      { error: "Failed to create magic link" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/board/[boardId]/links
 * Revokes a magic link (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;

    // Check ownership - redirects if not authenticated
    const user = await checkBoardOwnership(boardId);
    if (user instanceof NextResponse) return user; // Error response

    const body: RevokeLinkRequest = await request.json();
    const { linkId } = body;

    if (!linkId || typeof linkId !== 'number') {
      return NextResponse.json(
        { error: "Invalid link ID" },
        { status: 400 }
      );
    }

    await revokeMagicLink(linkId, boardId);

    return NextResponse.json({
      success: true,
      message: "Magic link revoked successfully"
    });
  } catch (error) {
    console.error("Error revoking magic link:", error);
    return NextResponse.json(
      { error: "Failed to revoke magic link" },
      { status: 500 }
    );
  }
}

/**
 * Set revalidation for caching
 */
export const revalidate = 0; // Don't cache magic links for security
