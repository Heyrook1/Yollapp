"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlBase =
  "w-full rounded-2xl border-[1.5px] bg-surface-elevated px-4 text-base font-semibold text-ink placeholder:font-medium placeholder:text-ink-faint transition focus:border-primary focus:outline-none disabled:bg-fill disabled:text-ink-secondary";

function borderClass(error?: string) {
  return error ? "border-danger" : "border-border";
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Label + control + hata/ipucu satırı. Hata mesajı aria ile input'a bağlanır. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm font-medium text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { error?: string };

export function TextInput({ error, className = "", ...rest }: TextInputProps) {
  return (
    <input
      className={`${controlBase} ${borderClass(error)} min-h-13 ${className}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && rest.id ? `${rest.id}-error` : undefined}
      {...rest}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: string };

export function Select({ error, className = "", children, ...rest }: SelectProps) {
  return (
    <select
      className={`${controlBase} ${borderClass(error)} min-h-13 appearance-none ${className}`}
      aria-invalid={error ? true : undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string };

export function Textarea({ error, className = "", ...rest }: TextareaProps) {
  return (
    <textarea
      className={`${controlBase} ${borderClass(error)} min-h-24 py-3 ${className}`}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
}
