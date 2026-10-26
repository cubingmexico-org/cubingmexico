import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const helpers: ReturnType<typeof generateReactHelpers<OurFileRouter>> =
  generateReactHelpers<OurFileRouter>();

export const uploadFiles: typeof helpers.uploadFiles = helpers.uploadFiles;
