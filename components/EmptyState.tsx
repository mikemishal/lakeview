type EmptyStateProps = {
  message: string;
};

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
      {message}
    </div>
  );
}
