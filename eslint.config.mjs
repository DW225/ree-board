import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  { ignores: ["scripts/**"] },
  ...nextCoreWebVitals,
  prettier,
  ...compat.extends("plugin:drizzle/all"),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
    },
  },
]);
