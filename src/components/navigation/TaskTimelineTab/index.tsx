import { useContext, useEffect, useState, useRef } from "react";
import { message } from "antd";
import {
  GanttComponent,
  Inject,
  Selection,
  Toolbar,
  DayMarkers,
  ColumnsDirective,
  ColumnDirective,
  ExcelExport,
  PdfExport,
} from "@syncfusion/ej2-react-gantt";
import type { TimelineSettingsModel } from "@syncfusion/ej2-react-gantt";
import { Select, Overlay } from "../../common";
import type { ClickEventArgs } from "@syncfusion/ej2-navigations";
import { GlobalContext } from "../../../lib/context";
import request from "../../../lib/request";
import dayjs from "dayjs";
import styles from "./styles.module.css";

const TaskTimelineTab = () => {
  const ganttRef = useRef<GanttComponent>(null);
  const { currentProject } = useContext(GlobalContext);
  const [loading, setLoading] = useState<boolean>(true);

  const processData = (tasks: any[]) => {
    const taskMap: any = {};

    tasks.sort((a: any, b: any) => a.TaskIndex - b.TaskIndex);

    tasks.forEach((task: any) => {
      task.subtasks = [];

      // Set StartDate and EndDate
      task.StartDate = task.StartDate ? new Date(task.StartDate) : null;
      task.EndDate = task.EndDate ? new Date(task.EndDate) : null;

      taskMap[task.TaskID] = task;
    });

    const out: any[] = [];

    tasks.forEach((task) => {
      if (task.ParentTaskId === 0) {
        out.push(task);
      } else {
        const parentTask = taskMap[task.ParentTaskId];
        if (parentTask) {
          parentTask.subtasks.push(task);
        }
      }
    });

    return out;
  };

  const fetchTasks = async () => {
    if (!currentProject["project_id"]) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result: any = await request.post("tasks/get", {
        id: currentProject["project_id"],
      });
      ganttRef.current?.updateDataSource(processData(result["tasks"]), {});
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [
    currentProject["project_id"],
    currentProject["schedule_start_date"],
    currentProject["schedule_end_date"],
  ]);

  const onViewModeChange = (e: any) => {
    if (e.target.value == "Grid") {
      ganttRef.current?.setSplitterPosition("100%", "position");
    } else if (e.target.value == "Chart") {
      ganttRef.current?.setSplitterPosition("0%", "position");
    } else {
      ganttRef.current?.setSplitterPosition("50%", "position");
    }
  };

  const taskFields = {
    id: "TaskID",
    name: "TaskName",
    startDate: "StartDate",
    endDate: "EndDate",
    duration: "Duration",
    progress: "Progress",
    dependency: "Predecessor",
    child: "subtasks",
  };

  const toolbar = [
    "ExpandAll",
    "CollapseAll",
    "ZoomIn",
    "ZoomOut",
    "ZoomToFit",
    "ExcelExport",
    "CsvExport",
    "PdfExport",
    {
      id: "viewmode",
      template: () => (
        <Select
          width={100}
          height={28}
          className="mb-1"
          onChange={onViewModeChange}
        >
          <option value="Default">Default</option>
          <option value="Grid">Grid</option>
          <option value="Chart">Chart</option>
        </Select>
      ),
    },
  ];

  const timelineTemplate = (props: any) => {
    if (props.tier == "topTier") {
      return (
        <div className={styles.header} title={props.date}>
          <p className={styles.heading}>
            {dayjs(props.date, "YYYY-MM-DD").isValid()
              ? dayjs(props.date, "YYYY-MM-DD").format("MMM D")
              : "N/A"}
          </p>
        </div>
      );
    }
  };

  const timelineSettings: TimelineSettingsModel = {
    topTier: { unit: "Day" },
    timelineUnitSize: 65,
  };

  const progressTemplate = (props: any) => {
    return props.taskData.Progress + "%";
  };

  const onClickToolbar = (args: ClickEventArgs) => {
    if (args.item.id?.endsWith("_excelexport")) {
      ganttRef.current?.excelExport();
    } else if (args.item.id?.endsWith("_csvexport")) {
      ganttRef.current?.csvExport();
    } else if (args.item.id?.endsWith("_pdfexport")) {
      ganttRef.current?.pdfExport({
        fitToWidthSettings: { isFitToWidth: true },
      });
    }
  };

  return (
    <div className="relative h-full">
      <GanttComponent
        ref={ganttRef}
        dataSource={[]}
        includeWeekend={true}
        highlightWeekends={true}
        allowSelection={true}
        allowUnscheduledTasks={true}
        showColumnMenu={false}
        gridLines="Both"
        dateFormat="y-MM-dd"
        toolbar={toolbar}
        timezone="UTC"
        splitterSettings={{ position: "50%" }}
        toolbarClick={onClickToolbar}
        taskFields={taskFields}
        loadingIndicator={{ indicatorType: "Shimmer" }}
        height="100%"
        timelineSettings={timelineSettings}
        labelSettings={{ taskLabel: "Progress" }}
        timelineTemplate={timelineTemplate}
        treeColumnIndex={1}
        allowExcelExport={true}
        allowPdfExport={true}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" width="70"></ColumnDirective>
          <ColumnDirective field="TaskName" width={300}></ColumnDirective>
          <ColumnDirective
            field="StartDate"
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective field="EndDate" textAlign="Right"></ColumnDirective>
          <ColumnDirective field="Duration" textAlign="Right"></ColumnDirective>
          <ColumnDirective
            field="Progress"
            textAlign="Right"
            template={progressTemplate}
          ></ColumnDirective>
        </ColumnsDirective>
        <Inject
          services={[Selection, DayMarkers, Toolbar, ExcelExport, PdfExport]}
        />
      </GanttComponent>

      <Overlay visible={loading} border={true}>
        Loading...
      </Overlay>
    </div>
  );
};

export { TaskTimelineTab };
