import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/next";
import { hasTeamPermission } from "@/lib/team-auth";

const f = createUploadthing();

async function requireMediaPermission(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.wcaId) {
    throw new UploadThingError("Unauthorized");
  }

  const stateId = req.headers.get("x-state-id") ?? "";
  if (!stateId) {
    throw new UploadThingError("Missing stateId");
  }

  const allowed = await hasTeamPermission(
    stateId,
    session.user.wcaId,
    "team.media",
  );
  if (!allowed) {
    throw new UploadThingError("Unauthorized");
  }

  return { userId: session.user.wcaId, stateId };
}

export const ourFileRouter: FileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => requireMediaPermission(req))
    .onUploadComplete(async ({ metadata, file }) => {
      return { stateId: metadata.stateId, image: file.ufsUrl };
    }),
  coverUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => requireMediaPermission(req))
    .onUploadComplete(async ({ metadata, file }) => {
      return { stateId: metadata.stateId, coverImage: file.ufsUrl };
    }),
};

export type OurFileRouter = typeof ourFileRouter;
