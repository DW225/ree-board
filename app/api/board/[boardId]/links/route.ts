import { hasRequiredRole, Role } from "@/lib/constants/role";
import {
  createMagicLink,
  fetchLinksByBoardId,
  revokeMagicLink,
} from "@/lib/db/link";
import { checkMemberRole } from "@/lib/db/member";
import { getUserBySupabaseId } from "@/lib/db/user";
import {
  BoardIdParamsSchema,
  CreateLinkRequestSchema,
  RevokeLinkRequestSchema,
} from "@/lib/types/link";
import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * RBAC helper for magic link API routes
 * Note: Can't use verifySession() from DAL because redirect() doesn't work in API routes
 */
async function checkBoardOwnership(boardId: string) {
  try {
    // Get Supabase user from session cookie
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Look up internal user
    const internalUser = await getUserBySupabaseId(user.id);
    if (!internalUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Check board membership and role
    const role = await checkMemberRole(internalUser.id, boardId);
    if (role === null) {
      // Not a member. Note that role=0 is valid (owner)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!hasRequiredRole(role, Role.owner)) {
      return NextResponse.json(
        { error: "Owner permissions required" },
        { status: 403 }
      );
    }

    return internalUser;
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 401 }
    );
  }
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
    // Validate route params
    const paramsResult = BoardIdParamsSchema.safeParse(await params);
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: paramsResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { boardId } = paramsResult.data;

    // Check ownership - redirects if not authenticated
    const checkResult = await checkBoardOwnership(boardId);
    if (checkResult instanceof NextResponse) return checkResult; // Error response

    const links = await fetchLinksByBoardId(boardId);

    return NextResponse.json({
      links,
      count: links.length,
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
    // Validate route params
    const paramsResult = BoardIdParamsSchema.safeParse(await params);
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: paramsResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { boardId } = paramsResult.data;

    // Check ownership - redirects if not authenticated
    const checkResult = await checkBoardOwnership(boardId);
    if (checkResult instanceof NextResponse) return checkResult; // Error response

    const body = await request.json();
    const bodyResult = CreateLinkRequestSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: bodyResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { role, expirationHours } = bodyResult.data;

    const newLink = await createMagicLink(
      boardId,
      role,
      checkResult.id,
      expirationHours // 0 means never expires
    );

    return NextResponse.json({
      link: newLink,
      success: true,
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
    // Validate route params
    const paramsResult = BoardIdParamsSchema.safeParse(await params);
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: paramsResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { boardId } = paramsResult.data;

    // Check ownership - redirects if not authenticated
    const user = await checkBoardOwnership(boardId);
    if (user instanceof NextResponse) return user; // Error response

    const body = await request.json();
    const bodyResult = RevokeLinkRequestSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: bodyResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { linkId } = bodyResult.data;

    await revokeMagicLink(linkId, boardId);

    return NextResponse.json({
      success: true,
      message: "Magic link revoked successfully",
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
