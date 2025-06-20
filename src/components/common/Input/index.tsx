import { useState } from "react";
import clsx from "clsx";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

export interface InputProps {
  type?: React.HTMLInputTypeAttribute;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  name?: string;
  block?: boolean;
  placeholder?: string;
  value?: number | string | null | undefined;
  onChange?: () => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  mb?: number;
  error?: string;
}

export const Input = ({
  type = "text",
  disabled = false,
  className = "",
  style,
  name = "",
  placeholder = "",
  value = undefined,
  onChange = () => {},
  prefix = null,
  suffix = null,
  block = false,
  mb = 0,
  error = "",
}: InputProps) => {
  const [showPwd, setShowPwd] = useState<boolean>(false);
  return (
    <div
      className={clsx("relative", block ? "w-full d-block" : "d-inline-block")}
    >
      <input
        type={type === "password" ? (showPwd ? "text" : "password") : type}
        {...(name && { name })}
        className={clsx("input round-4", className)}
        style={{
          ...style,
          ...(error && { marginBottom: 4 }),
          display: "block",
          width: "100%",
          height: 32,
          paddingLeft: prefix ? 36 : 16,
          paddingRight: suffix ? 36 : type === "password" ? 36 : 16,
        }}
        {...(value !== undefined && value !== null && { value })}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
      <p className="px-1 font-12 text-danger" style={{ marginBottom: mb - 4 }}>
        {error}
      </p>

      {prefix && (
        <div
          className="top-0 bottom-0 left-0 absolute d-grid d-grid-center"
          style={{ height: 32, width: 40 }}
        >
          {prefix}
        </div>
      )}
      {suffix ? (
        <div
          className="top-0 right-0 bottom-0 absolute d-grid d-grid-center"
          style={{ height: 32, width: 40 }}
        >
          {suffix}
        </div>
      ) : (
        type === "password" && (
          <div
            className="top-0 right-0 bottom-0 absolute d-grid d-grid-center cursor-pointer"
            onClick={() => setShowPwd((prev) => !prev)}
            style={{ height: 32, width: 40 }}
          >
            {showPwd ? (
              <IconEyeOff size={18} color="#666" />
            ) : (
              <IconEye size={18} color="#666" />
            )}
          </div>
        )
      )}
    </div>
  );
};
