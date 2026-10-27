import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { isSuperadmin } from "@/lib/superadmin";
import { deleteSocialPost } from "@/app/(root)/admin/_lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return unauthorizedResponse(userId);
  }

  const { id } = await params;
  const postId = id?.trim();
  if (!postId) {
    return NextResponse.json(
      { success: false, message: "id required" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteSocialPost(postId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Publicación no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error al eliminar la publicación",
      },
      { status: 502 },
    );
  }
}
