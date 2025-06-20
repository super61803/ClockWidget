import { Link } from "react-router-dom";
import clsx from "clsx";
import styles from "./styles.module.css";

export interface TabsProps {
  children: React.ReactNode;
}

export const Tabs = ({ children }: TabsProps) => {
  return <div className={styles["tabs"]}>{children}</div>;
};

export interface TabProps {
  href: string;
  label: string;
  active?: boolean;
}

export const Tab = ({ href, label, active = false }: TabProps) => {
  return (
    <Link
      to={href}
      className={clsx(
        "tab-item",
        active ? "active text-primary" : "text-secondary"
      )}
    >
      {label}
    </Link>
  );
};
