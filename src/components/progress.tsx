export function Progress({
  value,
  max,
  color = "bg-cyan-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const percent = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
