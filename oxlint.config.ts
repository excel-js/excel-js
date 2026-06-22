import { defineConfig } from "@gameroman/config/oxlint/ts";
import type { OxlintConfig } from "oxlint";

const config: OxlintConfig = defineConfig({
  options: {
    typeCheck: false,
  },
  rules: {
    "typescript/no-unnecessary-condition": "warn",
    "no-var": "warn",
    "prefer-template": "warn",
    "prefer-node-protocol": "warn",
    "no-unused-vars": "warn",
  },
});

export default config;
