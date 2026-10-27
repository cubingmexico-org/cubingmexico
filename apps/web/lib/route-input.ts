import { NextResponse } from "next/server";
import * as z from "zod";
import { isStateId } from "@/lib/state-flags";

export type RouteInput<T> =
  | { data: T; response?: never }
  | { data?: never; response: NextResponse };

export const stateIdSchema = z
  .string()
  .refine(isStateId, { message: "Invalid stateId" });

/** A non-negative integer path segment such as a slide index. */
export const indexParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "invalid slide index" })
  .transform(Number);

function badRequest(message: string): NextResponse {
  return NextResponse.json({ success: false, message }, { status: 400 });
}

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

function validate<T>(schema: z.ZodType<T>, value: unknown): RouteInput<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    return { response: badRequest(firstIssueMessage(result.error)) };
  }
  return { data: result.data };
}

/** Parses a JSON body; invalid JSON and schema mismatches become a 400. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<RouteInput<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { response: badRequest("Invalid JSON body") };
  }
  return validate(schema, json);
}

/** Like `parseJsonBody`, but an empty body is validated as `undefined`. */
export async function parseOptionalJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<RouteInput<T>> {
  const text = await request.text();
  if (!text.trim()) return validate(schema, undefined);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { response: badRequest("Invalid JSON body") };
  }
  return validate(schema, json);
}

/** Parses query params (single values only); schema mismatches become a 400. */
export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>,
): RouteInput<T> {
  return validate(schema, Object.fromEntries(searchParams));
}

/** Parses dynamic route params; schema mismatches become a 400. */
export function parseParams<T>(
  params: Record<string, string | string[] | undefined>,
  schema: z.ZodType<T>,
): RouteInput<T> {
  return validate(schema, params);
}
