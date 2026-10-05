import { describe, expect, it } from "vitest";
import { applySearchReplace } from "./search-replace";

const block = (search: string, replace: string) =>
  `<<<<<<< SEARCH\n${search}\n=======\n${replace}\n>>>>>>> REPLACE`;

describe("applySearchReplace", () => {
  it("makes each change in turn", () => {
    const response = [
      block("# One", "# First"),
      block("# Two", "# Second"),
    ].join("\n\n");
    expect(applySearchReplace("# One\n\n---\n\n# Two\n", response)).toEqual({
      text: "# First\n\n---\n\n# Second\n",
      applied: 2,
      skipped: 0,
    });
  });

  it("reads blocks inside a code fence", () => {
    const response = "```diff\n" + block("# One", "# First") + "\n```";
    expect(applySearchReplace("# One\n", response).text).toBe("# First\n");
  });

  it("replaces the whole source for an empty SEARCH", () => {
    const response = "<<<<<<< SEARCH\n=======\n# New\n>>>>>>> REPLACE";
    expect(applySearchReplace("# Old\n", response).text).toBe("# New");
  });

  it("counts changes whose SEARCH text isn't in the source", () => {
    const response = [
      block("# Missing", "# Gone"),
      block("# One", "# First"),
    ].join("\n");
    expect(applySearchReplace("# One\n", response)).toEqual({
      text: "# First\n",
      applied: 1,
      skipped: 1,
    });
  });

  it("changes nothing for an answer without blocks", () => {
    expect(applySearchReplace("# One\n", "Sorry, I can't help.")).toEqual({
      text: "# One\n",
      applied: 0,
      skipped: 0,
    });
  });
});
