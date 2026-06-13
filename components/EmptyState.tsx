import { EmptyStateDashedCard, LakeviewButton } from "@/components/ui/LakeviewPrimitives";

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
  const variantClassName =
    variant === "error"
      ? "border-red-300 bg-red-50 text-red-700"
      : variant === "loading"
      ? "bg-lakeview-card text-lakeview-text-secondary"
      : undefined;

  return (
    <EmptyStateDashedCard
      title={title}
      message={message}
      className={variantClassName}
      actions={
        <>
          {onAction && actionLabel ? (
            <LakeviewButton onClick={onAction} variant="primary">
              {actionLabel}
            </LakeviewButton>
          ) : null}
          {onRetry ? (
            <LakeviewButton onClick={onRetry} variant="ghost">
              {retryLabel}
            </LakeviewButton>
          ) : null}
        </>
      }
    />
  );
}
