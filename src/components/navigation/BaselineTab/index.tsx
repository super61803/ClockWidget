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
import { Select, Overlay } from "../../common";
import type { TimelineSettingsModel } from "@syncfusion/ej2-react-gantt";
import type { ClickEventArgs } from "@syncfusion/ej2-navigations";
import { GlobalContext } from "../../../lib/context";
import request from "../../../lib/request";

const BaselineTab = () => {
  const ganttRef = useRef<GanttComponent>(null);
  const { currentProject } = useContext(GlobalContext);
  const [loading, setLoading] = useState<boolean>(true);

  const processData = (tasks: any[]) => {
    tasks.sort((a: any, b: any) => a.TaskIndex - b.TaskIndex);

    tasks.forEach((task: any) => {
      // Set StartDate and EndDate
      task.StartDate = task.StartDate ? new Date(task.StartDate) : null;
      task.EndDate = task.EndDate ? new Date(task.EndDate) : null;
    });

    return tasks;
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
    baselineStartDate: "ActualStartDate",
    baselineEndDate: "ActualEndDate",
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

  const timelineSettings: TimelineSettingsModel = {
    timelineUnitSize: 65,
    topTier: {
      unit: "None",
    },
    bottomTier: {
      unit: "Day",
      count: 1,
      format: "d",
    },
  };
  let dayWorkingTime = [{ from: 0, to: 24 }];

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
        renderBaseline={true}
        showColumnMenu={false}
        allowUnscheduledTasks={true}
        dateFormat="y-MM-dd"
        treeColumnIndex={1}
        allowSelection={true}
        toolbar={toolbar}
        taskFields={taskFields}
        gridLines="Both"
        splitterSettings={{ position: "50%" }}
        labelSettings={{ taskLabel: "TaskName" }}
        timelineSettings={timelineSettings}
        timezone="UTC"
        height="100%"
        dayWorkingTime={dayWorkingTime}
        toolbarClick={onClickToolbar}
        allowExcelExport={true}
        allowPdfExport={true}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" width="70"></ColumnDirective>
          <ColumnDirective
            field="TaskName"
            headerText="Task Name"
            width="250"
            clipMode="EllipsisWithTooltip"
          ></ColumnDirective>
          <ColumnDirective
            field="StartDate"
            headerText="Planned Start Date"
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="EndDate"
            headerText="Planned End Date"
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="ActualStartDate"
            headerText="Actual Start Date"
            format={{ type: "date", format: "y-MM-dd" }}
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="ActualEndDate"
            headerText="Actual End Date"
            format={{ type: "date", format: "y-MM-dd" }}
            textAlign="Right"
          ></ColumnDirective>
        </ColumnsDirective>
        <Inject
          services={[Selection, Toolbar, DayMarkers, ExcelExport, PdfExport]}
        />
      </GanttComponent>

      <Overlay visible={loading} border={true}>
        Loading...
      </Overlay>
    </div>
  );
};

export { BaselineTab };
