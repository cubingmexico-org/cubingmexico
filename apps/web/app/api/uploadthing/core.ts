import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/next";
import { hasTeamPermission } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";

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

async function requireCompetitionLogoPermission(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.wcaId || !isSuperadmin(session.user.wcaId)) {
    throw new UploadThingError("Unauthorized");
  }

  const competitionId = req.headers.get("x-competition-id") ?? "";
  if (!competitionId) {
    throw new UploadThingError("Missing competitionId");
  }

  return { userId: session.user.wcaId, competitionId };
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
  competitionLogoUploader: f({
    image: {
      // Erased PNGs from WCA banners can exceed 2MB uncompressed.
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => requireCompetitionLogoPermission(req))
    .onUploadComplete(async ({ metadata, file }) => {
      return { competitionId: metadata.competitionId, logo: file.ufsUrl };
    }),
};

export type OurFileRouter = typeof ourFileRouter;
