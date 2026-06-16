import Container from "@/components/Container";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-10 space-y-6">
      <Skeleton className="mx-auto h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-8 w-56" />
      <ProductGridSkeleton />
    </Container>
  );
}
