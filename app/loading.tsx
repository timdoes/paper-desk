import { Skeleton } from "@/components/ui/skeleton";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";

export default function Loading() {
  return (
    <DeskBackdrop>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-8">
        <Skeleton className="h-16 w-80 bg-white/8" />
        <Skeleton className="h-20 w-full bg-white/8" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 bg-white/8" />
          ))}
        </div>
        <Skeleton className="h-80 w-full bg-white/8" />
      </div>
    </DeskBackdrop>
  );
}
