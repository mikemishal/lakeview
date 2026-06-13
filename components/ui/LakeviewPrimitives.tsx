import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type ClassValue = string | false | null | undefined;

function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

type PageContainerProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function AppPageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <div className={cx("lv-page-container", className)} {...props}>
      {children}
    </div>
  );
}

type CardProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <section className={cx("lv-card", className)} {...props}>
      {children}
    </section>
  );
}

type StatCardTone = "navy" | "gold" | "teal" | "amber";

type StatCardProps = {
  children: ReactNode;
  tone?: StatCardTone;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

const statCardToneClass: Record<StatCardTone, string> = {
  navy: "lv-stat-card-navy",
  gold: "lv-stat-card-gold",
  teal: "lv-stat-card-teal",
  amber: "lv-stat-card-amber",
};

export function StatCard({ children, tone = "teal", className, ...props }: StatCardProps) {
  return (
    <section className={cx("lv-stat-card", statCardToneClass[tone], className)} {...props}>
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "gold" | "ghost";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: "lv-btn-primary",
  gold: "lv-btn-gold",
  ghost: "lv-btn-ghost",
};

export function LakeviewButton({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cx("lv-btn", buttonVariantClass[variant], className)} {...props}>
      {children}
    </button>
  );
}

type StatusPillTone = "navy" | "teal" | "amber";

type StatusPillProps = {
  children: ReactNode;
  tone?: StatusPillTone;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

const statusPillToneClass: Record<StatusPillTone, string> = {
  navy: "",
  teal: "lv-status-pill-teal",
  amber: "lv-status-pill-amber",
};

export function StatusPill({ children, tone = "navy", className, ...props }: StatusPillProps) {
  return (
    <span className={cx("lv-status-pill", statusPillToneClass[tone], className)} {...props}>
      {children}
    </span>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <header className={cx("lv-section-header", className)}>
      <div>
        <h2 className="lv-section-title">{title}</h2>
        {subtitle ? <p className="lv-section-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

type PillGroupOption = {
  value: string;
  label: string;
};

type PillGroupToggleProps = {
  value: string;
  options: PillGroupOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function PillGroupToggle({ value, options, onChange, className }: PillGroupToggleProps) {
  return (
    <div className={cx("lv-pill-group", className)} role="tablist" aria-label="Toggle options">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cx("lv-pill-toggle", isActive && "lv-pill-toggle-active")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type EmptyStateDashedCardProps = {
  title?: string;
  message: string;
  actions?: ReactNode;
  className?: string;
};

export function EmptyStateDashedCard({ title, message, actions, className }: EmptyStateDashedCardProps) {
  return (
    <div className={cx("lv-empty-state", className)}>
      {title ? <h3 className="lv-empty-state-title">{title}</h3> : null}
      <p className={title ? "mt-1" : ""}>{message}</p>
      {actions ? <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
