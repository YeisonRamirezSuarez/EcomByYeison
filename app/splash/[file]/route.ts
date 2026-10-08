import { splashImage } from "@/lib/appIconImage";
import { splashSize } from "@/lib/appIcons";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const size = splashSize((await params).file);
  return size ? splashImage(size.width, size.height) : new Response(null, { status: 404 });
}
