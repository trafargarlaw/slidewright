import { Card, Cards } from "fumadocs-ui/components/card";
import { Laptop, Pencil, Puzzle, Rocket } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExampleDeck } from "@/components/examples";

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[0.9em]">
    {children}
  </code>
);

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border bg-fd-card px-1.5 font-mono text-[0.85em]">
    {children}
  </kbd>
);

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
        Slidewright
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-fd-muted-foreground">
        Write presentations in Markdown. Present them from the command line,
        export them to PDF, or put them in any React app.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
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
      </div>

      <ExampleDeck
        deck="packages/create/template/slides.md"
        css="packages/create/template/style.css"
      />
      <p className="text-fd-muted-foreground">
        This is the deck that <Code>npm create @slidewright</Code> starts you
        with. Click it and use the arrow keys, or press <Kbd>O</Kbd> for the
        overview.
      </p>

      <Cards className="mt-10">
        <Card icon={<Pencil />} title="Markdown first">
          One file, with <Code>---</Code> between slides. Notes and step markers
          are HTML comments, so the deck still reads well on GitHub.
        </Card>
        <Card icon={<Laptop />} title="Made to present">
          Steps, code highlighting, an overview of every slide, and a presenter
          view with notes and a timer in a second window.
        </Card>
        <Card icon={<Rocket />} title="Share it">
          Build a static site, or export a PDF or PNG images from the command
          line.
        </Card>
        <Card icon={<Puzzle />} title="In your app">
          <Code>{"<Deck markdown={markdown} />"}</Code> renders a deck in any
          React app, and follows the Markdown as it changes.
        </Card>
      </Cards>
    </main>
  );
}
