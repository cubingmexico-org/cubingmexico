import { db } from "@workspace/db";
import { design, type Design } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const ORGANIZER = "2015ORGA01";
export const STRANGER = "2016STRA01";
export const COMPETITION = "MexicoOpen2026";
export const OTHER_COMPETITION = "OtherOpen2026";

export async function insertDesign(
  values: Partial<typeof design.$inferInsert> & { id: string },
): Promise<Design> {
  const [row] = await db
    .insert(design)
    .values({
      name: values.id,
      userId: ORGANIZER,
      module: "badges",
      json: { elements: [] },
      ...values,
    })
    .returning();
  return row!;
}

export async function findDesign(id: string): Promise<Design | undefined> {
  const [row] = await db.select().from(design).where(eq(design.id, id));
  return row;
}

export function jsonRequest(
  path: string,
  method: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}
