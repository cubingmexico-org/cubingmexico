import { nextJsConfig } from "@workspace/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Link']:has(JSXAttribute[name.name='href'] > JSXExpressionContainer > TemplateLiteral > TemplateElement:first-child[value.raw=/^\\//]):not(:has(JSXAttribute[name.name='prefetch']))",
          message:
            "Dynamic <Link> hrefs must set prefetch explicitly (usually prefetch={false}) to avoid Vercel CDN requests and function CPU. See docs/web-hosting-constraints.md.",
        },
      ],
    },
  },
];
