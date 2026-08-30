import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

// `next lint` ignoraba .next/ y node_modules/ automaticamente sin necesitar
// un .eslintignore. La flat config no hereda ese comportamiento: sin este
// bloque, eslint lintaba los tipos generados dentro de .next/types y
// disparaba miles de errores que nunca fueron del proyecto.
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default eslintConfig;
