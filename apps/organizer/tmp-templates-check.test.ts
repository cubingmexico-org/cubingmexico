import { test } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { CERTIFICATE_DESIGN_TEMPLATES } from "./data/certificates";

const line = (node: JSONContent): string =>
  (node.content ?? [])
    .map((n) => (n.type === "mention" ? `@${n.attrs?.id}` : (n.text ?? "")))
    .join("");

test("print templates", () => {
  for (const t of CERTIFICATE_DESIGN_TEMPLATES) {
    const nodes = t.document.content.content ?? [];
    const filled = nodes.filter((n) => n.content?.length);
    console.log(
      [
        `${t.id.slice(-1)} ${t.name}`,
        `  ${t.module} ${t.document.pageConfig.pageOrientation}, leading blanks: ${nodes.findIndex((n) => n.content?.length)}, table: ${nodes.some((n) => n.type === "table")}`,
        `  first: ${line(filled[0]!)}`,
        `  last text: ${line(filled.filter((n) => n.type === "paragraph").at(-1)!)}`,
      ].join("\n"),
    );
  }
});
