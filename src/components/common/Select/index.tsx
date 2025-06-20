import clsx from "clsx";

export interface SelectProps {
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  width?: number | null;
  height?: number | null;
  className?: string;
  style?: React.CSSProperties;
  name?: string;
  block?: boolean;
  defaultValue?: number | string | null | undefined;
  value?: number | string | null | undefined;
  onChange?: (e: any) => void;
  mb?: number;
  error?: string;
  children?: React.ReactNode;
}

export const Select = ({
  disabled = false,
  width = null,
  height = null,
  className = "",
  style,
  name = "",
  block = false,
  defaultValue = undefined,
  value = undefined,
  onChange = () => {},
  mb = 0,
  error = "",
  children,
}: SelectProps) => {
  return (
    <div
      className={block ? "w-full d-block" : "d-inline-block"}
      style={{ ...(width !== null && { width }) }}
    >
      <select
        {...(name && { name })}
        className={clsx("round-4 select", className)}
        style={{
          ...style,
          ...(error && { marginBottom: 4 }),
          paddingLeft: 12,
          paddingRight: 32,
          display: "block",
          width: "100%",
          height: height !== null ? height : 32,
        }}
        {...(defaultValue !== null &&
          defaultValue !== undefined && { defaultValue })}
        {...(value !== undefined && value !== null && { value })}
        onChange={onChange}
        disabled={disabled}
      >
        {children && children}
      </select>
      <p className="font-12 text-danger" style={{ marginBottom: mb - 4 }}>
        {error}
      </p>
    </div>
  );
};
