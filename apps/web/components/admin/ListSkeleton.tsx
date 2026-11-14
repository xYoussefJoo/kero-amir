/** Placeholder rows shaped like the list, so nothing jumps when the data arrives. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3">
      <div className="admin-skel h-10 w-80 rounded-full" />
      {Array.from({ length: rows }, (_, i) => <div key={i} className="admin-skel h-20 rounded-2xl" />)}
    </div>
  );
}
