import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";

export default function CreateLoading() {
  return (
    <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5">
      <PageHeader
        title="Post a task"
        subtitle="Set a COPm reward and someone nearby will complete it."
      />
      <div className="block-card space-y-5 p-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-[120px] w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
