// Stops a publish that isn't made with bun. Each package runs this before it
// is published.
//
// npm leaves the `workspace:^` ranges in the published manifest, and nobody
// can install such a package: 0.1.3 was published that way.
const agent = process.env.npm_config_user_agent ?? "";

if (!agent.startsWith("bun/")) {
  console.error(
    "Publish with `bun run release`, from the repository's root. npm would " +
      "publish the `workspace:^` ranges, and the package could not be installed.",
  );
  process.exit(1);
}
