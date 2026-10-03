import { NextResponse } from "next/server";

/** 401 when there is no session; 403 when the user is signed in but lacks permission. */
export function unauthorizedResponse(userId: string | null): NextResponse {
  return userId
    ? NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      )
    : NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
}
