import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    "eslint/no-unused-vars": "error",
  },
});
