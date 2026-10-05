import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Editor } from "../components/Editor";
import sampleDeck from "../sample-deck.md?raw";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <ClientOnly>
      <Editor defaultValue={sampleDeck} />
    </ClientOnly>
  );
}
