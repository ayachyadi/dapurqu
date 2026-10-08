"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";

type Variant = "primary" | "secondary" | "inverted" | "outlined" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-600 text-white active:bg-primary-700 shadow-[0_6px_16px_-6px_rgba(150,65,24,0.6)]",
  secondary: "bg-sunken-2 text-primary-800 active:bg-line",
  inverted: "bg-ink text-white active:bg-black",
  outlined: "border border-primary-600/50 text-primary-700 bg-transparent active:bg-primary-50",
  danger: "bg-danger text-white active:opacity-90",
};

export function Button({
  variant = "primary",
  full,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold transition disabled:opacity-50",
        VARIANTS[variant],
        full && "w-full",
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition",
        active ? "bg-primary-600 text-white" : "bg-white text-body ring-1 ring-line",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TextField({ label, hint, right, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; right?: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-bold text-ink">{label}</span>}
      <span className="relative block">
        <input
          {...rest}
          className={cn(
            "w-full rounded-xl border border-line bg-sunken px-4 py-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-primary-600 focus:bg-white",
            !!right && "pr-12",
            className,
          )}
        />
        {right && <span className="absolute right-2 top-1/2 -translate-y-1/2">{right}</span>}
      </span>
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl bg-white p-4 shadow-[0_2px_14px_-6px_rgba(60,40,20,0.18)] ring-1 ring-line/70", className)}>{children}</div>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const tones = {
    info: "bg-primary-50 text-primary-800",
    warn: "bg-amber-50 text-amber-900",
    error: "bg-red-50 text-red-800",
    ok: "bg-secondary-50 text-secondary-700",
  };
  return <div className={cn("rounded-2xl px-4 py-3 text-[13px] leading-relaxed", tones[tone])}>{children}</div>;
}

export function Badge({ children, tone = "primary", className }: { children: ReactNode; tone?: "primary" | "green" | "dark" | "light"; className?: string }) {
  const tones = {
    primary: "bg-primary-600 text-white",
    green: "bg-secondary-600 text-white",
    dark: "bg-black/55 text-white backdrop-blur",
    light: "bg-white/90 text-ink backdrop-blur",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", tones[tone], className)}>{children}</span>;
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" style={{ background: "#974118" }}>
      <div className="flex flex-col items-center">
        <LogoMark width={150} />
        <p className="mt-5 text-[22px] font-extrabold tracking-tight text-[#f8f8f8]">DapurQu</p>
        <div className="mt-5 h-1.5 w-24 overflow-hidden rounded-full bg-white/25">
          <div className="h-full w-1/2 animate-[splashbar_1.1s_ease-in-out_infinite] rounded-full bg-white/90" />
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-bg/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur">
      {onBack && (
        <button onClick={onBack} aria-label="Kembali" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-line active:bg-sunken">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-extrabold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
