/**
 * Loading skeleton component for the boards list page.
 * Displays a header placeholder and grid of board card skeletons.
 */
export default function BoardsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto mt-8 px-4">
        <div className="h-9 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-64 h-40 bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
            >
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
