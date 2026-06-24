export default function RemindersLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 animate-pulse">
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <div className="h-3 w-16 bg-zinc-200 rounded mb-2" />
          <div className="h-6 w-28 bg-zinc-200 rounded" />
        </div>
        <div className="h-4 w-12 bg-zinc-200 rounded" />
      </div>
      <div className="px-4 mt-2 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 h-16" />
        <div className="h-12 bg-zinc-200 rounded-xl" />
      </div>
    </div>
  );
}
