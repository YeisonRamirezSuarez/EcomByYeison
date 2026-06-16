import Container from "@/components/Container";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Default fallback for storefront routes while the (dynamic) page renders.
export default function Loading() {
  return (
    <Container className="py-6 space-y-8">
      <Skeleton className="h-40 md:h-64 w-full rounded-xl" />
      <Skeleton className="h-8 w-48" />
      <ProductGridSkeleton />
    </Container>
  );
}
