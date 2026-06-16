import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import Title from "@/components/Title";
import { searchProducts } from "@/sanity/queries";
import { Product } from "@/sanity.types";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Search } from "lucide-react";

const SearchPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) => {
  const locale = await getServerLocale();
  const { query } = await searchParams;
  const term = (query ?? "").trim();
  const products: Product[] = term ? await searchProducts(term) : [];

  return (
    <div className="py-10">
      <Container>
        {/* Search field, prefilled with the current term. Native GET form. */}
        <form action="/search" className="relative mx-auto mb-8 max-w-xl">
          <input
            name="query"
            type="search"
            defaultValue={term}
            placeholder={t(locale, "searchPlaceholder")}
            aria-label={t(locale, "searchPlaceholder")}
            className="h-11 w-full rounded-full border border-gray-200 bg-gray-50 pl-5 pr-11 text-sm text-darkColor outline-none focus:border-shop_light_green focus:bg-white hoverEffect"
          />
          <button
            type="submit"
            aria-label={t(locale, "searchPlaceholder")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-shop_light_green hoverEffect"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        {term ? (
          <>
            <Title className="mb-5">
              {t(locale, "searchResultsFor")}:{" "}
              <span className="font-bold text-shop_dark_green">
                &ldquo;{term}&rdquo;
              </span>
            </Title>
            {products.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-60 flex-col items-center justify-center rounded-lg bg-gray-100 py-10 text-center">
                <p className="text-gray-600">{t(locale, "searchNoResults")}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-60 flex-col items-center justify-center rounded-lg bg-gray-100 py-10 text-center">
            <p className="text-gray-600">{t(locale, "searchPrompt")}</p>
          </div>
        )}
      </Container>
    </div>
  );
};

export default SearchPage;
