import { defineConfig } from "oxlint";

export default defineConfig({
  // The agent skills come from skills-lock.json, and are not part of the
  // project's code.
  ignorePatterns: [".agents/**", ".claude/**"],
  categories: {
    correctness: "warn",
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    "eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
  },
});
