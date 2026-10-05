// Writes the reference files of the agent skill in skills/slidewright from
// the syntax reference and the package READMEs.
//
// Run after a change to those docs: bun run skills
import { relative, resolve } from "node:path";
import { syncSkill } from "../apps/docs/lib/skills";

const repository = resolve(import.meta.dirname, "..");
const written = syncSkill(repository);
for (const file of written) {
  console.log(`Wrote ${relative(repository, file)}`);
}
if (written.length === 0) console.log("The skill is up to date.");
