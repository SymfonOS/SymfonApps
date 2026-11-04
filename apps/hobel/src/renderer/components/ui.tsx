// Primitives from replica/design/components.md. Tokens only, via Tailwind roles.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover border-transparent',
  secondary: 'bg-surface-raised text-text border-border hover:bg-hover',
  ghost: 'bg-transparent text-text border-transparent hover:bg-hover',
  danger: 'bg-transparent text-danger border-danger hover:bg-danger-bg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }>(
  function Button({ variant = 'secondary', size = 'md', loading, className = '', children, disabled, ...rest }, ref) {
    const h = size === 'sm' ? 'h-control-sm px-8' : size === 'lg' ? 'h-control-lg px-12' : 'h-control-md px-12';
    return (
      <button
        ref={ref}
        className={`inline-flex items-center gap-6 rounded-sm border text-sm font-medium transition-colors duration-fast disabled:bg-surface disabled:text-text-disabled disabled:border-border ${h} ${variants[variant]} ${className}`}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export function IconButton({ label, shortcut, pressed, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; shortcut?: string; pressed?: boolean }) {
  return (
    <button
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={pressed}
      className={`inline-grid h-control-md w-control-md place-items-center rounded-sm text-text-muted hover:bg-hover hover:text-text disabled:text-text-disabled disabled:hover:bg-transparent ${pressed ? 'bg-selection-inactive text-text' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-xs border border-border bg-surface-raised px-4 font-mono text-xs text-text-muted">{children}</kbd>;
}
