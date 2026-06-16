import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder grid that mirrors the real product grid layout. */
const ProductGridSkeleton = ({ count = 10 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-md p-2 space-y-3">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
