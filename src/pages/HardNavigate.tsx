import { useLayoutEffect } from "react";

export interface HardNavigateProps {
  to: string;
}

export const HardNavigate = ({ to = "/" }: HardNavigateProps) => {
  useLayoutEffect(() => {
    location.href = to;
  }, []);

  return <div></div>;
};
