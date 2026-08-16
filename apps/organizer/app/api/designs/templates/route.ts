import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { isDesignModule, requireSessionUser } from "@/lib/design-access";
import { serializeDesign } from "@/lib/design-schemas";
import { ensureGlobalDesignTemplates } from "@/lib/ensure-global-design-templates";

export async function GET(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module");

  if (moduleParam !== null && !isDesignModule(moduleParam)) {
    return Response.json({ error: "Invalid module" }, { status: 400 });
  }

  const designModule = moduleParam;

  await ensureGlobalDesignTemplates();

  const visibility = or(
    eq(design.ownerScope, "global"),
    eq(design.ownerScope, "org"),
    and(eq(design.ownerScope, "user"), eq(design.isPublic, true)),
  );

  const conditions = [
    isNull(design.competitionId),
    visibility,
    ...(designModule ? [eq(design.module, designModule)] : []),
  ];

  const rows = await db
    .select()
    .from(design)
    .where(and(...conditions))
    .orderBy(desc(design.updatedAt));

  return Response.json({
    designs: rows.map((row) => serializeDesign(row)),
  });
}
