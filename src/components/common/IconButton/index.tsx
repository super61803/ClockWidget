import { Button } from "antd";
import type { ButtonType } from "antd/es/button";
import { TooltipComponent } from "@syncfusion/ej2-react-popups";
import type { Position } from "@syncfusion/ej2-react-popups";
import { useNavigate } from "react-router-dom";

export interface IconButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  tooltip?: string;
  position?: Position;
  href?: string;
  type?: ButtonType;
  children: React.ReactNode;
}

export const IconButton = ({
  tooltip = "",
  position = "TopCenter",
  href = "",
  type = "text",
  children,
  ...props
}: IconButtonProps) => {
  const navigate = useNavigate();
  const tooltipMessage = tooltip.trim();

  const content = (
    <Button
      type={type}
      size="large"
      shape="circle"
      {...(href && { onClick: () => navigate(href) })}
      {...props}
    >
      {children}
    </Button>
  );

  return tooltipMessage ? (
    <TooltipComponent content={tooltipMessage} position={position}>
      {content}
    </TooltipComponent>
  ) : (
    content
  );
};
