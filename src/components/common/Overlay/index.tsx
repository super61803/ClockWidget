import clsx from "clsx";

export interface OverlayProps {
  visible?: boolean;
  border?: boolean;
  className?: string;
  transparent?: boolean;
  children: React.ReactNode;
}

export const Overlay = ({
  visible = false,
  border = false,
  className = "",
  transparent = false,
  children,
}: OverlayProps) => {
  return visible ? (
    <div
      className={clsx(
        "z-999 absolute inset-0 grid d-grid-center p-4 text-secondary",
        { border },
        { "bg-white": !transparent },
        className
      )}
    >
      {children}
    </div>
  ) : null;
};
