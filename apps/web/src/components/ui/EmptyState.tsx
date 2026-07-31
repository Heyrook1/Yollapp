import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

type EmptyProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] bg-fill-soft px-6 py-12 text-center">
      {icon ? (
        <span className="flex size-14 items-center justify-center rounded-2xl bg-fill text-ink-faint">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-lg font-extrabold tracking-tight text-ink">{title}</p>
        {description ? (
          <p className="mx-auto max-w-xs text-sm font-semibold text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

type ErrorProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description = "Lütfen tekrar deneyin. Sorun sürerse destek ile iletişime geçin.",
  action,
}: ErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-[24px] bg-danger-soft px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-elevated text-danger">
        <AlertIcon size={26} />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-extrabold tracking-tight text-ink">{title}</p>
        <p className="mx-auto max-w-xs text-sm font-semibold text-ink-secondary">{description}</p>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
