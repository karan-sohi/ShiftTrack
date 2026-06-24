export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 pb-12 animate-pulse">
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <div className="h-3 w-16 bg-zinc-200 rounded mb-2" />
          <div className="h-6 w-36 bg-zinc-200 rounded" />
        </div>
        <div className="h-9 w-24 bg-zinc-200 rounded-xl" />
      </div>

      {[0, 1, 2].map((i) => (
        <div key={i} className="px-4 mt-4">
          <div className="h-3 w-20 bg-zinc-200 rounded mb-2" />
          <div className="bg-white rounded-2xl border border-zinc-100 p-4 h-28" />
        </div>
      ))}

      <div className="px-4 mt-4">
        <div className="h-3 w-28 bg-zinc-200 rounded mb-2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 h-16 mb-2" />
        ))}
      </div>
    </div>
  );
}
