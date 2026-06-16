import Container from "@/components/Container";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-10 space-y-6">
      <Skeleton className="h-8 w-64" />
      <ProductGridSkeleton />
    </Container>
  );
}
