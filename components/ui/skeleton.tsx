import { cn } from "@/lib/utils";

/** Pulsing placeholder block used to build loading skeletons. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
