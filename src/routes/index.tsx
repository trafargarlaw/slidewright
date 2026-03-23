import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "../components/Editor";
import { initUnocss } from "../styles/unocss";
import slidesData from "virtual:slides";

initUnocss();

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <Editor defaultValue={slidesData.raw} />;
}
