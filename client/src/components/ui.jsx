import React, { useEffect, useId, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const BUTTON_VARIANTS = {
  primary: 'bg-board text-white hover:bg-board-deep shadow-[0_1px_0_rgba(20,33,61,0.25)]',
  ink: 'bg-ink text-white hover:bg-[#0c1529]',
  secondary: 'bg-paper text-ink border border-paper-rule hover:border-ink-faint hover:bg-paper-tint',
  ghost: 'text-ink-soft hover:text-ink hover:bg-ink/[0.05]',
  danger: 'bg-paper text-alarm border border-[#e7b4ae] hover:bg-[#fdf0ee]',
  onBoard: 'bg-paper text-ink hover:bg-paper-tint'
};

const BUTTON_SIZES = {
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[15px] gap-2',
  lg: 'min-h-12 px-5 text-base gap-2'
};

export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, staticPress = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[5px] font-semibold select-none',
        'transition-[background-color,border-color,color,scale,box-shadow] duration-150 ease-out-expo',
        !staticPress && 'active:scale-[0.96]',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Status stamps: coloured paper stock + a printed word, never colour  */
/* alone. Printed-mark states: outlined = pending, filled = active,    */
/* struck = spent.                                                     */
/* ------------------------------------------------------------------ */

const STAMPS = {
  UPCOMING: { label: 'Upcoming', cls: 'bg-stock-canary/40 text-stock-canary-ink border-stock-canary-ink/50 border-dashed' },
  OPEN: { label: 'Open now', cls: 'bg-stock-mint text-stock-mint-ink border-stock-mint-ink/40' },
  IN_PROGRESS: { label: 'In progress', cls: 'bg-hl text-ink border-ink/30' },
  SUBMITTED: { label: 'Submitted', cls: 'bg-stock-sky text-stock-sky-ink border-stock-sky-ink/40' },
  AUTO_SUBMITTED: { label: 'Auto-submitted', cls: 'bg-stock-salmon text-stock-salmon-ink border-stock-salmon-ink/40' },
  FLAGGED: { label: 'Flagged', cls: 'bg-stock-salmon text-stock-salmon-ink border-stock-salmon-ink/50' },
  CLOSED: { label: 'Closed', cls: 'bg-paper text-ink-faint border-paper-rule line-through decoration-ink-faint/70' },
  MISSED: { label: 'Missed', cls: 'bg-paper text-ink-faint border-paper-rule line-through decoration-ink-faint/70' },
  DRAFT: { label: 'Draft', cls: 'bg-paper text-ink-soft border-ink-faint/60 border-dashed' },
  PUBLISHED: { label: 'Published', cls: 'bg-stock-mint text-stock-mint-ink border-stock-mint-ink/40' },
  ACTIVE: { label: 'Active', cls: 'bg-stock-mint text-stock-mint-ink border-stock-mint-ink/40' },
  INACTIVE: { label: 'Deactivated', cls: 'bg-paper text-ink-faint border-paper-rule line-through decoration-ink-faint/70' },
  NEUTRAL: { label: '', cls: 'bg-paper-tint text-ink-soft border-paper-rule' },
  MARK: { label: '', cls: 'bg-paper text-ink border-ink' },
  INFO: { label: '', cls: 'bg-stock-sky text-stock-sky-ink border-stock-sky-ink/40' },
  WARN: { label: '', cls: 'bg-stock-canary text-stock-canary-ink border-stock-canary-ink/40' },
  ALERT: { label: '', cls: 'bg-stock-salmon text-stock-salmon-ink border-stock-salmon-ink/40' }
};

export const Stamp = ({ status = 'NEUTRAL', children, icon: Icon, className }) => {
  const s = STAMPS[status] || STAMPS.NEUTRAL;
  return (
    <span
      className={cx(
        'caps inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] border px-1.5 py-[3px] text-[11px] leading-none',
        s.cls,
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children || s.label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Sheets, headers, sections                                          */
/* ------------------------------------------------------------------ */

export const Sheet = ({ as: Tag = 'section', className, children, ...props }) => (
  <Tag className={cx('sheet', className)} {...props}>
    {children}
  </Tag>
);

export const PageHeader = ({ title, subtitle, actions, className }) => (
  <div className={cx('mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="min-w-0">
      <h1 className="display text-[2.5rem] text-ink sm:text-[3.25rem]">{title}</h1>
      {subtitle && <p className="mt-2 max-w-[62ch] text-[15px] text-ink-soft">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const SheetHeader = ({ title, meta, actions, className }) => (
  <div className={cx('flex flex-wrap items-center justify-between gap-3 border-b border-paper-line px-4 py-3 sm:px-5', className)}>
    <div className="flex min-w-0 items-baseline gap-3">
      <h2 className="caps text-[15px] text-ink">{title}</h2>
      {meta && <span className="num text-sm text-ink-faint">{meta}</span>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* A small printed figure: label over a tabular value with its unit */
export const Figure = ({ label, value, unit, tone, className }) => (
  <div className={cx('min-w-0', className)}>
    <div className="caps text-[11px] text-ink-faint">{label}</div>
    <div className={cx('num mt-1 text-2xl font-bold leading-none', tone || 'text-ink')}>
      {value}
      {unit && <span className="ml-1 text-sm font-semibold text-ink-faint">{unit}</span>}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Form fields: every label is bound to its control                    */
/* ------------------------------------------------------------------ */

const fieldBase =
  'w-full rounded-[5px] border border-paper-rule bg-paper px-3 text-[15px] text-ink placeholder:text-ink-faint/80 ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-ink-faint/70 ' +
  'focus:border-ink focus:outline-none focus:shadow-[0_0_0_3px_rgba(227,242,76,0.9)] ' +
  'disabled:bg-paper-tint disabled:text-ink-faint aria-[invalid=true]:border-alarm';

export const Field = ({ label, hint, error, children, className, required }) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const child = React.Children.only(children);

  return (
    <div className={cx('min-w-0', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-alarm" aria-hidden="true">*</span>}
        </label>
      )}
      {React.cloneElement(child, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required: required || child.props.required
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-sm text-alarm">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx(fieldBase, 'min-h-11', className)} {...props} />;
});

export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx(fieldBase, 'py-2.5 leading-relaxed', className)} {...props} />;
});

export const Select = React.forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx(fieldBase, 'min-h-11 cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  );
});

/* ------------------------------------------------------------------ */
/* Inline messages                                                     */
/* ------------------------------------------------------------------ */

const ALERT_TONES = {
  error: { cls: 'bg-stock-salmon/50 border-stock-salmon-ink/30 text-stock-salmon-ink', icon: AlertCircle, role: 'alert' },
  warn: { cls: 'bg-stock-canary/50 border-stock-canary-ink/30 text-stock-canary-ink', icon: AlertCircle, role: 'status' },
  success: { cls: 'bg-paper border-ink/40 text-ink', icon: CheckCircle2, role: 'status' },
  info: { cls: 'bg-paper border-paper-rule text-ink-soft', icon: Info, role: 'status' }
};

export const Alert = ({ tone = 'info', title, children, className, action }) => {
  const t = ALERT_TONES[tone];
  const Icon = t.icon;
  return (
    <div role={t.role} className={cx('flex items-start gap-2.5 rounded-[5px] border px-3.5 py-3 text-sm', t.cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-bold">{title}</div>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
};

export const Spinner = ({ label = 'Loading', className }) => (
  <div className={cx('flex items-center justify-center gap-2.5 py-16 text-ink-soft', className)} role="status">
    <Loader2 className="h-5 w-5 animate-spin text-board" aria-hidden="true" />
    <span className="text-sm">{label}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Empty state: a pinned notice                                        */
/* ------------------------------------------------------------------ */

export const EmptyNotice = ({ title, children, action, icon: Icon }) => (
  <div className="flex justify-center px-4 py-14">
    <div className="relative w-full max-w-sm rotate-[-0.8deg] rounded-[2px] bg-stock-canary/70 px-6 pb-6 pt-7 text-center shadow-pinned">
      <span className="pin" aria-hidden="true" />
      {Icon && <Icon className="mx-auto mb-2 h-6 w-6 text-stock-canary-ink" aria-hidden="true" />}
      <h3 className="caps text-lg text-ink">{title}</h3>
      {children && <p className="mt-1.5 text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Dialog: real dialog semantics, focus moves in, Escape closes        */
/* ------------------------------------------------------------------ */

export const Dialog = ({ open, onClose, title, children, footer, size = 'md', dismissible = true, labelledById }) => {
  const panelRef = useRef(null);
  const autoId = useId();
  const titleId = labelledById || `${autoId}-title`;

  // Pages pass a new onClose on every render; read it through a ref so the
  // focus effect below runs only when the dialog opens, not on every keystroke.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    // Prefer the first form field, so typing can start immediately; fall back to the first button
    const firstField = panel?.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
    const firstButton = panel?.querySelector('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
    (firstField || firstButton || panel)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible && onCloseRef.current) onCloseRef.current();
      if (e.key === 'Tab' && panel) {
        const items = panel.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [open, dismissible]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'sheet flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none shadow-pinned sm:rounded-sheet',
          widths[size]
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-paper-line px-5 py-4">
          <h2 id={titleId} className="caps text-lg text-ink">
            {title}
          </h2>
          {dismissible && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-[5px] text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-paper-line bg-paper-tint px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
};

export { cx };
