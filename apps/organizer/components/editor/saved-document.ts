import type { JSONContent } from "@tiptap/react";
import type { PageSize, PageOrientation, Margins } from "pdfmake/interfaces";

export interface SavedDocumentFile {
  content: JSONContent;
  pageConfig: {
    pageSize: PageSize;
    pageOrientation: PageOrientation;
    pageMargins: Margins;
  };
}

export const isSavedDocumentFile = (
  value: unknown,
): value is SavedDocumentFile => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const pageConfig = candidate.pageConfig;

  if (!pageConfig || typeof pageConfig !== "object") {
    return false;
  }

  return "content" in candidate;
};
