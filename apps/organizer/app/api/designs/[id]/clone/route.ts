import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  assertManagesCompetition,
  canReadDesign,
  requireSessionUser,
} from "@/lib/design-access";
import { cloneDesignSchema, serializeDesign } from "@/lib/design-schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = cloneDesignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [source] = await db
    .select()
    .from(design)
    .where(eq(design.id, id))
    .limit(1);

  if (!source) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let managesSourceCompetition = false;
  if (source.competitionId) {
    const access = await assertManagesCompetition(
      user.id,
      source.competitionId,
    );
    managesSourceCompetition = access.ok;
  }

  if (
    !canReadDesign({
      userId: user.id,
      competitionId: source.competitionId,
      userIdOwner: source.userId,
      isPublic: source.isPublic,
      ownerScope: source.ownerScope,
      managesCompetition: managesSourceCompetition,
    })
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetAccess = await assertManagesCompetition(
    user.id,
    parsed.data.competitionId,
  );
  if (!targetAccess.ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const [cloned] = await db
    .insert(design)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name?.trim() || `${source.name} (copia)`,
      competitionId: parsed.data.competitionId,
      userId: user.id,
      module: source.module,
      schemaVersion: source.schemaVersion,
      json: source.json,
      isPublic: false,
      ownerScope: "user",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!cloned) {
    return Response.json({ error: "Failed to clone design" }, { status: 500 });
  }

  return Response.json(
    { design: serializeDesign(cloned, { includeJson: true }) },
    { status: 201 },
  );
}
