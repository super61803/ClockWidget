import { useContext, useEffect, useState } from "react";
import { Select, message } from "antd";
import { Button } from "../../common";
import ReactApexChart from "react-apexcharts";
import { GlobalContext } from "../../../lib/context";
import request from "../../../lib/request";

const PerformanceTab = () => {
  const { currentProject } = useContext(GlobalContext);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tab, setTab] = useState<"variance" | "performance">("variance");
  const [selected, setSelected] = useState<any[]>([]);
  const [scheduleChartData, setScheduleChartData] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [performanceChartData, setPerformanceChartData] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchScheduleVariance = async (selected: any) => {
    const result: any = await request.post("tasks/schedule_variance", {
      id: currentProject["project_id"],
      tasks: selected,
    });
    setScheduleChartData({
      labels: result["labels"],
      datasets: [
        {
          name: "Earned Value",
          data: result["earned_values"],
        },
        {
          name: "Hours Charged",
          data: result["hours_charged"],
        },
        {
          name: "Schedule Variance",
          data: result["schedule_variance"],
        },
      ],
    });
  };

  const fetchTeamPerformance = async () => {
    const result: any = await request.post("tasks/team_performance", {
      id: currentProject["project_id"],
    });
    setPerformanceChartData({
      labels: result["labels"],
      datasets: [
        {
          name: "Total Duration",
          data: result["total_duration"],
        },
        {
          name: "Time Charged",
          data: result["time_charged"],
        },
        {
          name: "Tasks Assigned",
          data: result["tasks_assigned"],
        },
        {
          name: "Overall Progress",
          data: result["overall_progress"],
        },
        {
          name: "Performance Variance",
          data: result["performance_variance"],
        },
      ],
    });
  };

  const onChange = async (e: any) => {
    try {
      setLoading(true);
      setSelected(e);
      fetchScheduleVariance(e);
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentProject["project_id"]) {
      setLoading(false);
      return;
    }

    (async function () {
      try {
        setLoading(true);
        if (tab === "variance") {
          const result: any = await request.post("tasks/get", {
            id: currentProject["project_id"],
          });
          setTasks(result["tasks"]);
          setSelected(result["tasks"].map((r: any) => r["TaskID"]));
          await fetchScheduleVariance(
            result["tasks"].map((r: any) => r["TaskID"])
          );
        } else {
          await fetchTeamPerformance();
        }
      } catch (error: any) {
        message.error(error.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [tab, currentProject["project_id"]]);

  return (
    <div className="d-flex flex-column bg-white px-6 py-4 border h-full overflow-auto">
      <div className="pb-4 nogrow noshrink">
        <Button
          outline={tab === "performance"}
          onClick={() => setTab("variance")}
          hasBorder={false}
        >
          Schedule Variance
        </Button>
        <Button
          outline={tab === "variance"}
          onClick={() => setTab("performance")}
          hasBorder={false}
        >
          Team Performance
        </Button>
      </div>

      {loading && <div className="flex-auto d-grid-center">Loading...</div>}

      {!loading && tab === "variance" && (
        <div className="d-flex flex-column gap-8">
          <div>
            <p className="mb-1">Select Tasks</p>
            <Select
              mode="multiple"
              value={selected}
              onChange={(e) => onChange(e)}
              maxTagCount="responsive"
              className="w-full"
              disabled={loading}
            >
              {tasks.map((r: any) => (
                <Select.Option key={r["TaskID"]} value={r["TaskID"]}>
                  {r["TaskName"]}
                </Select.Option>
              ))}
            </Select>
          </div>

          <ReactApexChart
            options={{
              plotOptions: { bar: { horizontal: false, columnWidth: "55%" } },
              dataLabels: { enabled: false },
              stroke: { show: true, width: 2, colors: ["transparent"] },
              xaxis: {
                categories: scheduleChartData["labels"],
                labels: {
                  rotate: 0,
                  show: true,
                  hideOverlappingLabels: false,
                  formatter: (value) => {
                    if (value.toString().length < 16) {
                      return value;
                    } else {
                      return value.toString().substring(0, 16) + "...";
                    }
                  },
                },
              },
              fill: { opacity: 1 },
              colors: ["#066fd1", "#9bc5ed", "#388cda"],
            }}
            series={scheduleChartData["datasets"]}
            type="bar"
            height={450}
          />

          <table className="mb-4 table">
            <thead>
              <tr className="bg-table-header">
                <td>TaskName</td>
                <td className="text-right">Earned Value</td>
                <td className="text-right">Hours Charged</td>
                <td className="text-right">Schedule Variance</td>
              </tr>
            </thead>
            <tbody>
              {scheduleChartData["labels"].length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center">
                    No records
                  </td>
                </tr>
              )}
              {scheduleChartData["labels"].map((r: string, index: number) => (
                <tr key={index}>
                  <td>{r}</td>
                  <td className="text-right">
                    {parseFloat(
                      scheduleChartData["datasets"][0]["data"][index]
                    ).toFixed(2)}
                  </td>
                  <td className="text-right">
                    {parseFloat(
                      scheduleChartData["datasets"][1]["data"][index]
                    ).toFixed(2)}
                  </td>
                  <td className="text-right">
                    {parseFloat(
                      scheduleChartData["datasets"][2]["data"][index]
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "performance" && (
        <div className="d-flex flex-column gap-8">
          <ReactApexChart
            options={{
              chart: { type: "bar", stacked: true },
              plotOptions: { bar: { horizontal: true } },
              xaxis: { categories: performanceChartData["labels"] },
              fill: { opacity: 1 },
              colors: ["#066fd1", "#f67019", "#f53794", "#00a950", "#8549ba"],
            }}
            series={performanceChartData["datasets"]}
            type="bar"
            height={performanceChartData["labels"].length * 20 + 90}
          />

          <table className="mb-4 table">
            <thead>
              <tr className="bg-table-header">
                <td>Resources</td>
                <td className="text-right">Total Duration</td>
                <td className="text-right">Time Charged</td>
                <td className="text-right">Tasks Assigned</td>
                <td className="text-right">Overall Progress</td>
                <td className="text-right">Performance Variance</td>
              </tr>
            </thead>
            <tbody>
              {performanceChartData["labels"].length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center">
                    No records
                  </td>
                </tr>
              )}
              {performanceChartData["labels"].map(
                (r: string, index: number) => (
                  <tr key={index}>
                    <td>{r}</td>
                    <td className="text-right">
                      {performanceChartData["datasets"][0]["data"][index]}
                    </td>
                    <td className="text-right">
                      {performanceChartData["datasets"][1]["data"][index]}
                    </td>
                    <td className="text-right">
                      {performanceChartData["datasets"][2]["data"][index]}
                    </td>
                    <td className="text-right">
                      {performanceChartData["datasets"][3]["data"][index]}
                    </td>
                    <td className="text-right">
                      {performanceChartData["datasets"][4]["data"][index]}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export { PerformanceTab };
