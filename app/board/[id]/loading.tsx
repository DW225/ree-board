export default function BoardPageLoading() {
  return (
    <div className="container mx-auto w-full max-w-full px-4">
      {/* Header skeleton */}
      <div className="flex justify-end py-2 gap-2">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="w-10 h-10 rounded-md bg-slate-200 animate-pulse" />
        <div className="w-10 h-10 rounded-md bg-slate-200 animate-pulse" />
      </div>

      {/* Board columns skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map((col) => (
          <div key={col} className="space-y-3">
            <div className="h-8 bg-slate-200 rounded w-32 mb-4 animate-pulse" />
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 rounded w-5/6 mb-3" />
                <div className="flex justify-between items-center">
                  <div className="h-6 w-12 bg-slate-200 rounded" />
                  <div className="h-6 w-6 bg-slate-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
