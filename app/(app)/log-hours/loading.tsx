export default function LogHoursLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 animate-pulse">
      <div className="px-4 pt-12 pb-6 flex items-center gap-3">
        <div className="h-4 w-12 bg-zinc-200 rounded" />
        <div className="h-6 w-24 bg-zinc-200 rounded" />
      </div>
      <div className="px-4 flex flex-col gap-5">
        <div className="h-16 bg-zinc-100 rounded-xl" />
        <div className="flex gap-3">
          <div className="flex-1 h-16 bg-zinc-100 rounded-xl" />
          <div className="flex-1 h-16 bg-zinc-100 rounded-xl" />
        </div>
        <div className="h-16 bg-zinc-100 rounded-xl" />
        <div className="h-12 bg-zinc-200 rounded-xl" />
      </div>
    </div>
  );
}
