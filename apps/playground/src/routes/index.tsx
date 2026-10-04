import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Editor } from "../components/Editor";
import { initUnocss } from "../styles/unocss";

initUnocss();

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <ClientOnly>
      <Editor defaultValue={""} />
    </ClientOnly>
  );
}
