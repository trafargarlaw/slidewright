"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A shell command on one line, with a button that copies it. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex max-w-full items-center gap-3 rounded-lg border bg-fd-card py-2 pr-2 pl-4 font-mono text-sm">
      <span aria-hidden className="text-fd-muted-foreground select-none">
        $
      </span>
      <code className="min-w-0 truncate">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy the command"}
        className="ml-auto rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
