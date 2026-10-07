import type { Metadata } from "next";
import Container from "@/components/Container";
import UnsubscribeForm from "@/components/UnsubscribeForm";
import { isValidUnsubscribe } from "@/lib/unsubscribe";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export const metadata: Metadata = { title: "Darse de baja", robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const s = typeof params.s === "string" ? params.s : "";
  const t = typeof params.t === "string" ? params.t : "";
  const { storeName } = await getSiteSettings();
  return (
    <Container className="py-16">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
        {isValidUnsubscribe(s, t) ? (
          <UnsubscribeForm subscriberId={s} signature={t} storeName={storeName} />
        ) : (
          <p className="text-gray-700">Este enlace no es válido.</p>
        )}
      </div>
    </Container>
  );
}
