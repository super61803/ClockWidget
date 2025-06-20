import { useEffect, useState } from "react";
import { message } from "antd";
import { Select, Card, Button } from "../../components/common";
import { StatisticsCard } from "../../components/dashboard";
import ReactApexChart from "react-apexcharts";
import moment from "moment";
import request from "../../lib/request";

const Dashboard = () => {
  const [data, setData] = useState<any>({
    projects: [],
    tasks: [],
    projects_cnt: 0,
    projects_total_cnt: 0,
    tasks_assigned_cnt: 0,
    tasks_critical_cnt: 0,
    tasks_overdue_cnt: 0,
    tasks_total_cnt: 0,
  });
  const [curProjId, setCurProjId] = useState<number>(-1);
  const [chartData, setChartData] = useState<any>({
    labels: [],
    values: [],
  });
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (curProjId < 0) {
      setComments([]);
    } else {
      const curProject = data["projects"].find(
        (r: any) => r["project_id"] == curProjId
      );
      setComments(curProject ? curProject["comments"] : []);
    }
  }, [curProjId]);

  useEffect(() => {
    (async function () {
      try {
        const response: any = await request.post("projects/dashboard");
        setData(response);
        setChartData({
          labels: response.projects.map((r: any) => r["project_name"]),
          values: response.projects.map((r: any) => r["overall_progress"]),
        });
        if (
          response["projects"][0] === null ||
          response["projects"][0] === undefined
        ) {
          setCurProjId(-1);
        } else {
          setCurProjId(response["projects"][0]["project_id"]);
        }
      } catch (error: any) {
        message.error(error.message || "Something went wrong");
      }
    })();
  }, []);

  return (
    <div
      className="py-4 overflow-auto"
      style={{ height: "calc(100vh - 38px)" }}
    >
      <div className="container">
        <div className="d-flex justify-between items-center mb-4">
          <p className="text-secondary title">Dashboard</p>
          <Button href="/navigation" variant="danger" outline={true}>
            My Projects
          </Button>
        </div>

        <div className="dash-card-container">
          <StatisticsCard
            name="Projects"
            num1={data["projects_cnt"]}
            num2={data["projects_total_cnt"]}
          />
          <StatisticsCard
            name="Tasks"
            num1={data["tasks_assigned_cnt"]}
            num2={data["tasks_total_cnt"]}
          />
          <StatisticsCard
            name="Critical Path Tasks"
            num1={data["tasks_critical_cnt"]}
            num2={data["tasks_assigned_cnt"]}
          />
          <StatisticsCard
            name="Overdue Tasks"
            num1={data["tasks_overdue_cnt"]}
            num2={data["tasks_assigned_cnt"]}
          />
        </div>

        <div className="gap-4 d-grid grid-3 mb-4">
          <Card padding={0} className="grid-span-2 round-4">
            <div className="p-4">
              <p className="bold">My Projects</p>
            </div>
            <div
              className="border-top overflow-auto"
              style={{ maxHeight: 300, minHeight: 200 }}
            >
              <table className="dash-table">
                <thead>
                  <tr className="bg-table-header">
                    <td>Project Name</td>
                    <td>Project Owner</td>
                    <td className="text-right">Schedule Start</td>
                    <td className="text-right">Schedule End</td>
                    <td className="text-right">Assigned Tasks</td>
                    <td className="text-right">Your Overall Progress</td>
                  </tr>
                </thead>
                <tbody>
                  {data["projects"].map((r: any) => (
                    <tr key={r["project_id"]}>
                      <td>{r["project_name"]}</td>
                      <td>{r["project_owner_name"]}</td>
                      <td className="text-right">{r["schedule_start_date"]}</td>
                      <td className="text-right">{r["schedule_end_date"]}</td>
                      <td className="text-right">{r["assigned_tasks_cnt"]}</td>
                      <td className="text-right">
                        {parseFloat(r["overall_progress"]).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card padding={0} className="round-4">
            <div className="p-4">
              <p className="bold">Overall Progress</p>
            </div>
            <div className="px-4 pb-4">
              <ReactApexChart
                series={chartData["values"]}
                type="donut"
                height={280}
                options={{
                  colors: [
                    "#066fd1",
                    "#388cda",
                    "#9bc5ed",
                    "#4FA3E0",
                    "#A1C6E7",
                    "#6495ED",
                    "#B0C4DE",
                  ],
                  labels: chartData["labels"],
                  dataLabels: { enabled: true },
                  legend: { position: "right" },
                  responsive: [
                    {
                      breakpoint: 1600,
                      options: { legend: { position: "bottom" } },
                    },
                  ],
                }}
              />
            </div>
          </Card>
        </div>

        <div className="gap-4 d-grid grid-3 mb-4">
          <Card padding={0} className="grid-span-2 round-4">
            <div className="p-4 border-bottom">
              <p className="bold">Overdue Tasks</p>
            </div>
            <div
              className="overflow-auto"
              style={{ maxHeight: 300, minHeight: 200 }}
            >
              <table className="dash-table">
                <thead>
                  <tr className="bg-table-header">
                    <td>Project</td>
                    <td>Task</td>
                    <td className="text-right">Schedule Start</td>
                    <td className="text-right">Schedule End</td>
                    <td className="text-right">Progress</td>
                  </tr>
                </thead>
                <tbody>
                  {data["tasks"].map((r: any) => (
                    <tr key={r["task_id"]}>
                      <td>{r["project_name"]}</td>
                      <td>{r["task_name"]}</td>
                      <td className="text-right">{r["schedule_start_date"]}</td>
                      <td className="text-right">{r["schedule_end_date"]}</td>
                      <td className="text-right">
                        {parseFloat(r["progress"]).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card padding={0} className="round-4">
            <div className="d-flex justify-between items-center px-4 py-3 border-bottom">
              <p className="bold">Recent Comments</p>
              <div className="d-flex items-center gap-2">
                <Select
                  value={curProjId}
                  onChange={(e: any) => setCurProjId(e.target.value)}
                  height={30}
                  width={160}
                  className="font-12"
                >
                  {data["projects"].map((r: any) => (
                    <option key={r["project_id"]} value={r["project_id"]}>
                      {r["project_name"]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div
              className="px-4 pt-2 pb-4 overflow-auto"
              style={{ maxHeight: 300, minHeight: 200 }}
            >
              {comments.map((r: any) => (
                <div key={r["id"]} className="mb-2">
                  <p className="font-13">{r["text"].substr(0, 50) + "..."}</p>
                  <p className="font-11 text-secondary">
                    {r["user_name"]} commented {moment(r["datetime"]).fromNow()}
                  </p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="font-13 text-secondary">No Comments</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
