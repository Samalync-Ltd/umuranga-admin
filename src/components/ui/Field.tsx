import { useId, type InputHTMLAttributes } from "react";

export function Field({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-meta font-medium text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={
          "rounded-md border bg-surface px-3 py-2 text-body text-fg " +
          "placeholder:text-fg-subtle transition-colors duration-200 " +
          (error ? "border-brand-red" : "border-border-strong")
        }
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-status-urgent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
