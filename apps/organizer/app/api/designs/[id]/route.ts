import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  assertManagesCompetition,
  canReadDesign,
  canWriteDesign,
  requireSessionUser,
} from "@/lib/design-access";
import { serializeDesign, updateDesignSchema } from "@/lib/design-schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function loadDesignAccess(userId: string, id: string) {
  const [row] = await db.select().from(design).where(eq(design.id, id)).limit(1);

  if (!row) {
    return { kind: "missing" as const };
  }

  let managesCompetition = false;
  if (row.competitionId) {
    const access = await assertManagesCompetition(userId, row.competitionId);
    managesCompetition = access.ok;
  }

  return { kind: "ok" as const, row, managesCompetition };
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await loadDesignAccess(user.id, id);
  if (result.kind === "missing") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { row, managesCompetition } = result;
  if (
    !canReadDesign({
      userId: user.id,
      competitionId: row.competitionId,
      userIdOwner: row.userId,
      isPublic: row.isPublic,
      ownerScope: row.ownerScope,
      managesCompetition,
    })
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({
    design: serializeDesign(row, { includeJson: true }),
  });
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await loadDesignAccess(user.id, id);
  if (result.kind === "missing") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { row, managesCompetition } = result;
  if (
    !canWriteDesign({
      userId: user.id,
      competitionId: row.competitionId,
      userIdOwner: row.userId,
      ownerScope: row.ownerScope,
      managesCompetition,
    })
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateDesignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (
    parsed.data.name === undefined &&
    parsed.data.json === undefined &&
    parsed.data.isPublic === undefined
  ) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  // Competition designs stay private; only library user templates toggle isPublic
  const nextIsPublic =
    row.competitionId === null
      ? (parsed.data.isPublic ?? row.isPublic)
      : false;

  const [updated] = await db
    .update(design)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.json !== undefined
        ? { json: parsed.data.json as Record<string, unknown> }
        : {}),
      isPublic: nextIsPublic,
      updatedAt: new Date(),
    })
    .where(eq(design.id, id))
    .returning();

  if (!updated) {
    return Response.json({ error: "Failed to update design" }, { status: 500 });
  }

  return Response.json({
    design: serializeDesign(updated, { includeJson: true }),
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await loadDesignAccess(user.id, id);
  if (result.kind === "missing") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { row, managesCompetition } = result;
  if (
    !canWriteDesign({
      userId: user.id,
      competitionId: row.competitionId,
      userIdOwner: row.userId,
      ownerScope: row.ownerScope,
      managesCompetition,
    })
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(design).where(eq(design.id, id));

  return Response.json({ ok: true });
}
