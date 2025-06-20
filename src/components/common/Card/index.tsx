import clsx from "clsx";

export interface CardProps {
  style?: React.CSSProperties;
  width?: number | null;
  padding?: number | null;
  className?: string;
  children: React.ReactNode;
}

export const Card = ({
  style = {},
  width = null,
  padding = null,
  className = "",
  children,
}: CardProps) => {
  return (
    <div
      className={clsx("bg-white card", className)}
      style={{
        ...style,
        ...(padding !== null && { padding }),
        ...(width !== null && { maxWidth: width }),
      }}
    >
      {children}
    </div>
  );
};
