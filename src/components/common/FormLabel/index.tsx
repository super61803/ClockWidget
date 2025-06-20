import clsx from "clsx";

export interface FormLabelProps {
  label?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormLabel = ({
  label = "",
  className = "",
  children,
}: FormLabelProps) => {
  return (
    <div className={clsx("relative nogrow, noshrink", className)}>
      {children}
      {label && (
        <div className="absolute px-1 font-12 text-nowrap" style={{ top: -16 }}>
          {label}
        </div>
      )}
    </div>
  );
};
