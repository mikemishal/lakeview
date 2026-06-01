type EmptyStateProps = {
  message: string;
  title?: string;
  variant?: "empty" | "loading" | "error";
  actionLabel?: string;
  onAction?: () => void;
  retryLabel?: string;
  onRetry?: () => void;
};

export default function EmptyState({
  message,
  title,
  variant = "empty",
  actionLabel,
  onAction,
  retryLabel = "Retry",
  onRetry,
}: EmptyStateProps) {
  const variantStyles =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : variant === "loading"
      ? "border-slate-200 bg-slate-50 text-slate-600"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={`space-y-3 rounded-xl border p-6 text-center text-sm shadow-sm ring-1 ring-slate-100 ${variantStyles}`}>
      {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}
      <p>{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            {actionLabel}
          </button>
        ) : null}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
