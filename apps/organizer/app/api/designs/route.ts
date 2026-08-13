import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  assertManagesCompetition,
  isDesignModule,
  requireSessionUser,
} from "@/lib/design-access";
import { createDesignSchema, serializeDesign } from "@/lib/design-schemas";

export async function GET(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitionId = searchParams.get("competitionId");
  const moduleParam = searchParams.get("module");

  if (!competitionId) {
    return Response.json(
      { error: "competitionId is required" },
      { status: 400 },
    );
  }

  if (!moduleParam || !isDesignModule(moduleParam)) {
    return Response.json({ error: "Invalid module" }, { status: 400 });
  }

  const access = await assertManagesCompetition(user.id, competitionId);
  if (!access.ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(design)
    .where(
      and(
        eq(design.competitionId, competitionId),
        eq(design.module, moduleParam),
      ),
    )
    .orderBy(desc(design.updatedAt));

  return Response.json({
    designs: rows.map((row) => serializeDesign(row)),
  });
}

export async function POST(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createDesignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const competitionId = data.competitionId ?? null;

  // Phase 1: only user-scope creates via API (org/global are seeded)
  if (data.ownerScope !== "user") {
    return Response.json(
      { error: "Only ownerScope=user can be created via API" },
      { status: 400 },
    );
  }

  if (competitionId) {
    const access = await assertManagesCompetition(user.id, competitionId);
    if (!access.ok) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!data.isPublic) {
    return Response.json(
      { error: "Library templates without competitionId must be public" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const now = new Date();

  const [row] = await db
    .insert(design)
    .values({
      id,
      name: data.name,
      competitionId,
      userId: user.id,
      module: data.module,
      schemaVersion: data.schemaVersion,
      json: data.json as Record<string, unknown>,
      isPublic: competitionId ? false : Boolean(data.isPublic),
      ownerScope: "user",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    return Response.json({ error: "Failed to create design" }, { status: 500 });
  }

  return Response.json(
    { design: serializeDesign(row, { includeJson: true }) },
    { status: 201 },
  );
}
