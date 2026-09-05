import type {ButtonHTMLAttributes, PropsWithChildren, ReactNode} from "react";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    icon?: ReactNode;
  }
>;

export function Button({variant = "secondary", icon, children, className = "", ...props}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} type="button" {...props}>
      {icon ? <span className="button__icon">{icon}</span> : null}
      {children}
    </button>
  );
}
