import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDeck } from "@slidewright/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create, detectPackageManager, main, packageName } from "../src/index";

let root = "";
let cwd = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "slidewright-create-"));
  cwd = process.cwd();
  process.chdir(root);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("npm_config_user_agent", "npm/10.9.2 node/v22.12.0 darwin arm64");
});

afterEach(() => {
  process.chdir(cwd);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

const output = (method: "log" | "error") =>
  vi
    .mocked(console[method])
    .mock.calls.map((call) => call.join(" "))
    .join("\n");

const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("create", () => {
  it("writes the template and a package.json", () => {
    create("My Talk", { version: "0.1.0", packageManager: "npm" });

    expect(readdirSync(join(root, "My Talk")).sort()).toEqual([
      ".gitignore",
      "README.md",
      "package.json",
      "slides.md",
      "style.css",
    ]);
    expect(JSON.parse(read("My Talk", "package.json"))).toEqual({
      name: "my-talk",
      private: true,
      type: "module",
      scripts: { dev: "slidewright", build: "slidewright build" },
      devDependencies: { "@slidewright/cli": "^0.1.0" },
    });
    expect(read("My Talk", ".gitignore")).toBe("node_modules\ndist\n");
  });

  it("writes the README for the package manager in use", () => {
    create("talk", { version: "0.1.0", packageManager: "pnpm" });
    const readme = read("talk", "README.md");
    expect(readme).toContain("pnpm install\npnpm run dev");
    expect(readme).not.toMatch(/^npm /m);
  });

  it("fills an empty folder, and leaves a folder with files alone", () => {
    mkdirSync("empty");
    create("empty", { version: "0.1.0", packageManager: "npm" });
    expect(readdirSync(join(root, "empty"))).toContain("slides.md");

    mkdirSync("used");
    writeFileSync(join(root, "used", "notes.txt"), "keep me");
    expect(() =>
      create("used", { version: "0.1.0", packageManager: "npm" }),
    ).toThrow("used already exists and is not empty.");
    expect(readdirSync(join(root, "used"))).toEqual(["notes.txt"]);
  });

  it("starts with a deck that parses cleanly", () => {
    create("talk", { version: "0.1.0", packageManager: "npm" });
    const deck = parseDeck(read("talk", "slides.md"));

    expect(deck.diagnostics).toEqual([]);
    expect(deck.config.title).toBe("My talk");
    expect(deck.slides.map((slide) => slide.frontmatter.layout)).toEqual([
      "cover",
      undefined,
      undefined,
      "two-cols",
      "fact",
      "statement",
    ]);
  });
});

describe("main", () => {
  it("creates the project and prints the next steps", async () => {
    vi.stubEnv("npm_config_user_agent", "bun/1.3.4 npm/? node/v24.14.0");
    expect(await main(["talk"])).toBe(0);

    expect(output("log")).toBe(
      "\nCreated a deck in talk. Next:\n\n  cd talk\n  bun install\n  bun run dev\n",
    );
    expect(JSON.parse(read("talk", "package.json")).name).toBe("talk");
  });

  it("quotes a folder name with spaces", async () => {
    expect(await main(["My Talk"])).toBe(0);
    expect(output("log")).toContain("  cd 'My Talk'\n");
  });

  it("creates the project in the current folder", async () => {
    expect(await main(["."])).toBe(0);
    expect(output("log")).toContain(
      "Created a deck in .. Next:\n\n  npm install",
    );
    expect(readdirSync(root)).toContain("slides.md");
  });

  it("uses my-talk without a terminal to ask in", async () => {
    const { isTTY } = process.stdin;
    process.stdin.isTTY = false;
    try {
      expect(await main([])).toBe(0);
    } finally {
      process.stdin.isTTY = isTTY;
    }
    expect(readdirSync(join(root, "my-talk"))).toContain("slides.md");
  });

  it.each([
    [["a", "b"], "Expected one folder, got a, b."],
    [["--nope"], "Unknown option '--nope'"],
  ])("rejects %j", async (args, message) => {
    expect(await main(args)).toBe(1);
    expect(output("error")).toContain(message);
  });

  it("prints help", async () => {
    expect(await main(["--help"])).toBe(0);
    expect(output("log")).toContain("Usage: npm create @slidewright [folder]");
  });
});

describe("detectPackageManager", () => {
  it.each([
    ["npm/10.9.2 node/v22.12.0 darwin arm64", "npm"],
    ["pnpm/10.0.0 npm/? node/v22.12.0 darwin arm64", "pnpm"],
    ["yarn/4.6.0 npm/? node/v22.12.0 darwin arm64", "yarn"],
    ["bun/1.3.4 npm/? node/v24.3.0 darwin arm64", "bun"],
    ["deno/2.1.0 npm/? deno/2.1.0 darwin arm64", "npm"],
    [undefined, "npm"],
  ])("reads %j as %s", (userAgent, expected) => {
    expect(detectPackageManager(userAgent)).toBe(expected);
  });
});

describe("packageName", () => {
  it.each([
    ["My Talk!", "my-talk"],
    ["talk_2026", "talk_2026"],
    [".hidden", "hidden"],
    ["--draft--", "draft"],
    ["Café", "caf"],
    ["!!!", "slides"],
  ])("makes %j into %j", (folder, expected) => {
    expect(packageName(folder)).toBe(expected);
  });
});
