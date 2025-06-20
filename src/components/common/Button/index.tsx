import { useNavigate } from "react-router-dom";
import clsx from "clsx";

export interface ButtonProps {
  href?: string;
  onClick?: () => void;
  size?: "small" | "medium" | "large";
  type?: "button" | "submit" | "reset";
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "dark"
    | "light";
  outline?: boolean;
  hasBorder?: boolean;
  disabled?: boolean;
  block?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children: string;
}

export const Button = ({
  href = "",
  onClick = () => {},
  variant = "primary",
  outline = false,
  hasBorder = true,
  disabled = false,
  type = "button",
  loading = false,
  style = {},
  className = "",
  block = false,
  children,
}: ButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      {...(href ? { onClick: () => navigate(href) } : { onClick })}
      type={type}
      disabled={disabled ? true : loading}
      className={clsx(
        `px-4 font-14 button round-4`,
        outline ? `bg-transparent text-${variant}` : `bg-${variant} text-white`,
        hasBorder && `border-${variant}`,
        className
      )}
      style={{
        ...style,
        ...(block && { display: "block", width: "100%" }),
        height: 32,
      }}
    >
      {children}
    </button>
  );
};
