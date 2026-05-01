"use client";

import { AlertTriangle, Info, XCircle } from "lucide-react";

type ActionModalTone = "info" | "danger" | "error";

type ActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  tone?: ActionModalTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const toneStyles: Record<ActionModalTone, { icon: typeof Info; iconClassName: string; buttonClassName: string }> = {
  info: {
    icon: Info,
    iconClassName: "bg-emerald-50 text-emerald-700",
    buttonClassName: "bg-emerald-700 text-white hover:bg-emerald-800",
  },
  danger: {
    icon: AlertTriangle,
    iconClassName: "bg-rose-50 text-rose-700",
    buttonClassName: "bg-rose-700 text-white hover:bg-rose-800",
  },
  error: {
    icon: XCircle,
    iconClassName: "bg-rose-50 text-rose-700",
    buttonClassName: "bg-rose-700 text-white hover:bg-rose-800",
  },
};

export function ActionModal({
  open,
  title,
  description,
  tone = "info",
  confirmLabel = "Aceptar",
  cancelLabel,
  onConfirm,
  onCancel,
}: ActionModalProps) {
  if (!open) {
    return null;
  }

  const styles = toneStyles[tone];
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-stone-950/45 px-3 py-4 sm:place-items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
        aria-describedby="action-modal-description"
        className="w-full max-w-md rounded-lg bg-white p-4 shadow-2xl"
      >
        <div className="flex gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${styles.iconClassName}`}>
            <Icon aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="action-modal-title" className="text-lg font-semibold text-stone-950">
              {title}
            </h2>
            <p id="action-modal-description" className="mt-2 text-sm leading-6 text-stone-600">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {cancelLabel && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              {cancelLabel}
            </button>
          ) : null}
          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold ${styles.buttonClassName}`}
            >
              {confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
