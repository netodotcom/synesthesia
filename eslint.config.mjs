import next from "eslint-config-next";

/**
 * No Next 16 o `eslint-config-next` já é flat config (array). Espalhar direto —
 * embrulhar em FlatCompat gera "Converting circular structure to JSON".
 */
const eslintConfig = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
