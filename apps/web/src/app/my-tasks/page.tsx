import { Suspense } from "react";
import { MyTasksView } from "./MyTasksView";

function MyTasksFallback() {
  return (
    <div className="page-shell mx-auto max-w-lg px-4 pb-28 pt-5">
      <div className="skeleton mb-2 h-8 w-40 rounded-lg" />
      <div className="skeleton mb-5 h-4 w-64 rounded-md" />
      <div className="skeleton mb-4 h-11 w-full rounded-full" />
      <div className="space-y-4 py-2">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  return (
    <Suspense fallback={<MyTasksFallback />}>
      <MyTasksView />
    </Suspense>
  );
}
