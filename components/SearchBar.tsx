import { Search } from "lucide-react";
import Link from "next/link";

/**
 * Product search. Uses a native GET form that navigates to /search?query=…, so
 * it works without client JS. On mobile the header is tight, so we collapse to
 * an icon that links to the dedicated search page (which has its own input).
 */
const SearchBar = ({ placeholder }: { placeholder: string }) => {
  return (
    <>
      <form action="/search" className="relative hidden md:flex items-center">
        <input
          name="query"
          type="search"
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-48 lg:w-64 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-9 text-sm text-darkColor outline-none focus:border-shop_light_green focus:bg-white hoverEffect"
        />
        <button
          type="submit"
          aria-label={placeholder}
          className="absolute right-3 text-gray-500 hover:text-shop_light_green hoverEffect"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      <Link href="/search" aria-label={placeholder} className="md:hidden">
        <Search className="h-5 w-5 hover:text-shop_light_green hoverEffect" />
      </Link>
    </>
  );
};

export default SearchBar;
