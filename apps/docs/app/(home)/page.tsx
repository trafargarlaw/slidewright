import { Card } from "fumadocs-ui/components/card";
import {
  Atom,
  Bot,
  Clapperboard,
  Code,
  Cpu,
  ListOrdered,
  Pencil,
  Presentation,
  Puzzle,
  Rocket,
  Shapes,
  SquareTerminal,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyCommand } from "@/components/copy-command";
import { ExampleDeck } from "@/components/examples";

const InlineCode = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[0.9em]">
    {children}
  </code>
);

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border bg-fd-card px-1.5 font-mono text-[0.85em]">
    {children}
  </kbd>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="mt-16">
    <h2 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h2>
    {children}
  </section>
);

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
        Slides in Markdown,{" "}
        <span className="text-fd-primary">made to present</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-fd-muted-foreground">
        Write a presentation as a Markdown file. Present it from the command
        line, export it to PDF, or put it in any React app.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/docs"
          className="rounded-full bg-fd-primary px-5 py-2 font-medium text-fd-primary-foreground"
        >
          Get started
        </Link>
        <Link
          href="/docs/examples/layouts"
          className="rounded-full border px-5 py-2 font-medium hover:bg-fd-accent"
        >
          See the examples
        </Link>
        <CopyCommand command="npm create @slidewright my-talk" />
      </div>

      <ExampleDeck
        deck="packages/create/template/slides.md"
        css="packages/create/template/style.css"
      />
      <p className="text-fd-muted-foreground">
        This is the deck that <InlineCode>npm create @slidewright</InlineCode>{" "}
        gives you. Click it, then use the arrow keys. Press <Kbd>O</Kbd> to see
        all the slides.
      </p>

      <Section title="All that a talk needs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            icon={<Pencil />}
            title="Markdown first"
            href="/docs/reference/syntax"
          >
            One file, with <InlineCode>---</InlineCode> between slides. Notes
            and step markers are HTML comments, so the deck is easy to read on
            GitHub too.
          </Card>
          <Card
            icon={<ListOrdered />}
            title="Steps and notes"
            href="/docs/reference/syntax#steps"
          >
            Show a slide one part at a time. Write notes for each step.
          </Card>
          <Card icon={<Code />} title="Code" href="/docs/examples/code">
            Syntax colours, line numbers, titles, diffs, and lines that you
            highlight one step at a time.
          </Card>
          <Card
            icon={<Workflow />}
            title="Diagrams and maths"
            href="/docs/examples/diagrams"
          >
            Mermaid diagrams in the colours of the slide, and LaTeX maths.
          </Card>
          <Card icon={<Shapes />} title="Icons" href="/docs/examples/icons">
            Write <InlineCode>:lucide:rocket:</InlineCode> to show an icon from
            more than 200 Iconify sets.
          </Card>
          <Card
            icon={<Clapperboard />}
            title="Transitions"
            href="/docs/examples/transitions"
          >
            Fade, slide or zoom from one slide to the next, or make your own
            transition with CSS.
          </Card>
          <Card
            icon={<Presentation />}
            title="Presenter view"
            href="/docs/reference/react#presenter-view"
          >
            Your notes, the next slide and a timer, in a second window that
            moves with the deck.
          </Card>
          <Card
            icon={<Rocket />}
            title="Share it"
            href="/docs/reference/cli#deploy"
          >
            Build a static site for any host, or export the deck to PDF or PNG
            files.
          </Card>
          <Card
            icon={<Puzzle />}
            title="In your app"
            href="/docs/reference/react"
          >
            <InlineCode>{"<Deck markdown={markdown} />"}</InlineCode> shows a
            deck in any React app, and changes when the Markdown changes.
          </Card>
        </div>
      </Section>

      <Section title="Choose how to use it">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            icon={<SquareTerminal />}
            title="Command line"
            href="/docs/reference/cli"
          >
            Present, build and export a deck. The project needs only the
            Markdown file.
          </Card>
          <Card icon={<Zap />} title="Vite plugin" href="/docs/reference/vite">
            Serve and build a deck in a Vite project.
          </Card>
          <Card
            icon={<Atom />}
            title="React component"
            href="/docs/reference/react"
          >
            Show a deck in a React app, such as an editor or a docs site.
          </Card>
          <Card icon={<Cpu />} title="Parser" href="/docs/reference/core">
            Read decks and compile slides for your own renderer or tools.
          </Card>
        </div>
      </Section>

      <Section title="Write with an AI agent">
        <div className="flex flex-col gap-4 rounded-xl border bg-fd-card p-6 md:flex-row md:items-center">
          <Bot className="size-8 shrink-0 text-fd-primary" />
          <p className="text-fd-muted-foreground md:flex-1">
            A skill teaches the deck format to an agent such as Claude Code,
            Codex or Cursor. Add it to your project, then ask the agent for a
            deck.
          </p>
          <CopyCommand command="npx skills add trafargarlaw/slidewright" />
        </div>
      </Section>
    </main>
  );
}
