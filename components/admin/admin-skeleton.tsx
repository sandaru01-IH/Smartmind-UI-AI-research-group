/** What the admin shows the instant a link is clicked, while the page behind it loads. */
export function AdminSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading</span>
      <div aria-hidden="true" className="space-y-3">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-4 w-full max-w-[34rem]" />
      </div>
      <div aria-hidden="true" className="grid gap-px border border-line bg-line sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 bg-surface p-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-8 w-20" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-px border border-line bg-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 bg-surface p-4">
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton hidden h-4 w-24 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
