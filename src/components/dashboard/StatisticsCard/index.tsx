import { Card } from "../../common";

export interface StatisticsCardProps {
  name?: string;
  num1?: number;
  num2?: number;
}

export const StatisticsCard = ({
  name = "",
  num1 = 0,
  num2 = 0,
}: StatisticsCardProps) => {
  return (
    <Card padding={24} className="round-4">
      <p className="font-12 text-nowrap text-secondary">{name}</p>
      <p className="mb-3">
        <span style={{ fontSize: 32 }}>{num1}</span>/{num2}
      </p>

      <div className="progress-bar">
        <div
          className="progress"
          style={{ width: num2 === 0 ? 0 : (100 * num1) / num2 + "%" }}
        ></div>
      </div>
    </Card>
  );
};
