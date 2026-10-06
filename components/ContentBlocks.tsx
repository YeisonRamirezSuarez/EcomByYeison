import Link from "next/link";
import { HelpCircle } from "lucide-react";
import type { ContentBlock, PageContent } from "@/lib/brand";
import { isValidHref } from "@/lib/validation";
import { CONTENT_ICON_COMPONENTS } from "./contentIcons";

const CARD =
  "flex items-start gap-4 group p-4 rounded-xl border border-gray-100 bg-white hover:border-shop_light_green/30 hover:shadow-sm hoverEffect";

function Block({ block }: { block: ContentBlock }) {
  // Studio edits skip panel validation: unknown icons and unsafe links fall back safely.
  const Icon = CONTENT_ICON_COMPONENTS[block.icon] ?? HelpCircle;
  const body = (
    <>
      <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-1">{block.title}</h3>
        {block.text && <p className="text-gray-500 text-sm leading-relaxed">{block.text}</p>}
      </div>
    </>
  );
  if (!block.href || !isValidHref(block.href)) return <div className={CARD}>{body}</div>;
  if (block.href.startsWith("/")) {
    return (
      <Link href={block.href} className={CARD}>
        {body}
      </Link>
    );
  }
  return (
    <a href={block.href} target="_blank" rel="noopener noreferrer" className={CARD}>
      {body}
    </a>
  );
}

const ContentBlocks = ({ page, layout }: { page: PageContent; layout: "grid" | "list" }) => (
  <>
    {page.intro && (
      <div className="max-w-3xl space-y-4 text-gray-600 leading-relaxed mb-10">
        {page.intro.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    )}
    {page.blocks.length > 0 && (
      <div className={layout === "grid" ? "grid sm:grid-cols-2 gap-4 max-w-3xl" : "max-w-3xl space-y-3"}>
        {page.blocks.map((block, i) => (
          <Block key={block._key ?? i} block={block} />
        ))}
      </div>
    )}
  </>
);

export default ContentBlocks;
