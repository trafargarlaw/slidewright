import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Editor } from "../components/Editor";
import { initUnocss } from "../styles/unocss";
import sampleDeck from "../sample-deck.md?raw";

initUnocss();

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
