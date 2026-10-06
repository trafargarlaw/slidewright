import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import Link from "next/link";
import { baseOptions } from "@/lib/layout.shared";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-mono text-sm font-medium text-fd-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-4 text-fd-muted-foreground">
          Search the docs, or go to one of these pages.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-full bg-fd-primary px-5 py-2 font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/85"
          >
            Getting started
          </Link>
          <Link
            href="/"
            className="rounded-full border px-5 py-2 font-medium transition-colors hover:bg-fd-accent"
          >
            Home
          </Link>
        </div>
      </main>
    </HomeLayout>
  );
}
