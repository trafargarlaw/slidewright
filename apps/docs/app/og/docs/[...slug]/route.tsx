import { source } from "@/lib/source";
import { notFound } from "next/navigation";
import { generateOGImage } from "fumadocs-ui/og";
import { Logo } from "@/components/logo";
import { appName, getPageImageUrl } from "@/lib/shared";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: appName,
    icon: <Logo width={48} height={48} />,
    primaryColor: "rgba(143, 138, 255, 0.35)",
    primaryTextColor: "#8f8aff",
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImageUrl(page).segments,
  }));
}
