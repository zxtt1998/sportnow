import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, SearchX, X, Zap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="SportNow 首页">
      <span className="brand-symbol">
        <Zap fill="currentColor" size={21} />
      </span>
      <span>
        Sport<span className="brand-now">Now</span>
        <span className="brand-period">.</span>
      </span>
    </Link>
  );
}
export function BackBar({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="back-bar">
      <button
        className="icon-button"
        aria-label="返回"
        onClick={() =>
          location.key === "default"
            ? navigate("/", { replace: true })
            : navigate(-1)
        }
      >
        <ArrowLeft size={21} />
      </button>
      <span>{title}</span>
      <div className="back-trailing">{trailing}</div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <SearchX size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭弹窗"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Segments<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segments" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={value === option.value ? "selected" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
