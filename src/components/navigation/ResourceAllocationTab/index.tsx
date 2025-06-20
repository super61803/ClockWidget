import { useEffect, useState, useContext, useRef } from "react";
import { message } from "antd";
import {
  GanttComponent,
  EditDialogFieldsDirective,
  DayMarkers,
  EditDialogFieldDirective,
  Inject,
  Edit,
  Selection,
  Resize,
  Toolbar,
  ColumnsDirective,
  ColumnDirective,
  ExcelExport,
  PdfExport,
} from "@syncfusion/ej2-react-gantt";
import type {
  TimelineSettingsModel,
  EditSettingsModel,
} from "@syncfusion/ej2-react-gantt";
import { Select, Overlay } from "../../common";
import { DropDownList } from "@syncfusion/ej2-dropdowns";
import type { ClickEventArgs } from "@syncfusion/ej2-navigations";
import { GlobalContext } from "../../../lib/context";
import request from "../../../lib/request";
import { MILESTONES } from "../../../lib/constants";
import dayjs from "dayjs";

const ResourceAllocationTab = () => {
  const ganttRef = useRef<GanttComponent>(null);
  const { currentProject, owners } = useContext(GlobalContext);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleAllocation, setVisibleAllocation] = useState<boolean>(true);

  let elem: any;
  let dropdownlistObj: any;
  let dropdownlist = {
    create: () => {
      elem = document.createElement("input");
      return elem;
    },
    read: () => {
      return dropdownlistObj.value;
    },
    destroy: () => {
      dropdownlistObj.destroy();
    },
    write: (args: any) => {
      dropdownlistObj = new DropDownList({
        dataSource: MILESTONES.map((r: string) => ({ id: r, text: r })),
        fields: { text: "text", value: "id" },
        value: args.rowData[args.column.field],
        floatLabelType: "Auto",
      });
      dropdownlistObj.appendTo(elem);
    },
  };

  const processData = (tasks: any[]) => {
    const taskMap: any = {};

    tasks.sort((a: any, b: any) => a.TaskIndex - b.TaskIndex);

    tasks.forEach((task: any) => {
      task.subtasks = [];

      // Set HoursCharged and HoursLeft
      if (!task.StartDate || !task.EndDate) {
        task.HoursLeft = null;
      } else {
        const startDate = dayjs(task.StartDate, "YYYY-MM-DD");
        const endDate = dayjs(task.EndDate, "YYYY-MM-DD");
        const duration = endDate.diff(startDate, "day") + 1;
        const hoursLeft = 8 * duration * (1 - task.Progress / 100);
        task.HoursLeft = hoursLeft.toFixed(2);
      }
      task.HoursCharged = 0;

      // Set StartDate and EndDate
      task.StartDate = task.StartDate ? new Date(task.StartDate) : null;
      task.EndDate = task.EndDate ? new Date(task.EndDate) : null;

      // Set Resources
      task.resources = task.Resources.split(",")
        .filter((r: string) => r !== "")
        .map((r: string) => parseInt(r));

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

  const serializeTasks = (tasks: any[]) => {
    const out: any[] = [];

    const serialize = (tasks: any[]) => {
      tasks.forEach((task: any) => {
        out.push({
          TaskID: task.TaskID,
          Resources: task.resources.map((r: any) => r.id).join(","),
          Milestone: task.Milestone,
        });

        if (task.subtasks && task.subtasks.length > 0) {
          serialize(task.subtasks);
        }
      });
    };

    serialize(tasks);
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

  const saveTasks = async () => {
    if (!ganttRef.current || !ganttRef.current.dataSource) return;

    try {
      const updates = serializeTasks(ganttRef.current.dataSource as any[]);

      const result: any = await request.post("tasks/update_resource", {
        id: currentProject["project_id"],
        data: updates,
      });

      ganttRef.current?.updateDataSource(processData(result["tasks"]), {});
      ganttRef.current?.toolbarModule.enableItems(
        ["save_changes", "reset_changes"],
        false
      );
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
      ganttRef.current?.toolbarModule.enableItems(
        ["save_changes", "reset_changes"],
        true
      );
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
    hoursCharged: "HoursCharged",
    hoursLeft: "HoursLeft",
    resourceInfo: "resources",
    progress: "Progress",
    dependency: "Predecessor",
    child: "subtasks",
  };
  const resourceFields = {
    id: "id",
    name: "name",
  };
  const editSettings: EditSettingsModel = {
    allowEditing: currentProject["project_status"] === "Open",
  };
  const toolbar = [
    {
      id: "save_changes",
      text: "Save",
      prefixIcon: "e-save",
      disabled: true,
      click: async () => {
        await saveTasks();
      },
    },
    {
      id: "reset_changes",
      text: "Reset",
      disabled: true,
      click: async () => {
        if (confirm("Reset can not be undone, continue?")) {
          await fetchTasks();
        }
      },
    },
    "ExpandAll",
    "CollapseAll",
    {
      text: "Show/Hide Overallocation",
      tooltipText: "Show/Hide Overallocation",
      id: "showhidebar",
    },
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
    topTier: {
      unit: "Week",
      format: "y-MM-dd",
    },
    bottomTier: { unit: "Day" },
  };

  const resourcesTemplate = (props: any) => {
    return props.taskData.resources
      .filter((r: any) => !!r["name"])
      .map((r: any) => (
        <div key={r["id"]} className="resource">
          &nbsp;&nbsp;&nbsp;{r["name"]}&nbsp;&nbsp;&nbsp;
        </div>
      ));
  };

  const hoursChargedTemplate = (props: any) => {
    if (
      props.taskData.HoursCharged === null ||
      props.taskData.HoursCharged === undefined
    ) {
      return null;
    } else {
      return props.taskData.HoursCharged + " hours";
    }
  };

  const hoursLeftTemplate = (props: any) => {
    if (
      props.taskData.HoursLeft === null ||
      props.taskData.HoursLeft === undefined
    ) {
      return null;
    } else {
      return props.taskData.HoursLeft + " hours";
    }
  };

  const milestoneTemplate = (props: any) => {
    if (props.taskData.Milestone) {
      return <div className="tag">{props.taskData.Milestone}</div>;
    } else {
      return null;
    }
  };

  const onClickToolbar = (args: ClickEventArgs) => {
    if (args.item.id === "showhidebar") {
      setVisibleAllocation((prev) => !prev);
    } else if (args.item.id?.endsWith("_excelexport")) {
      ganttRef.current?.excelExport();
    } else if (args.item.id?.endsWith("_csvexport")) {
      ganttRef.current?.csvExport();
    } else if (args.item.id?.endsWith("_pdfexport")) {
      ganttRef.current?.pdfExport({
        fitToWidthSettings: { isFitToWidth: true },
      });
    }
  };

  const onBeforeAction = (args: any) => {
    if (args.requestType === "beforeOpenEditDialog") {
      args.cancel = true;
    }
  };

  const onAction = async (args: any) => {
    switch (args.requestType) {
      case "save": {
        ganttRef.current?.toolbarModule.enableItems(
          ["save_changes", "reset_changes"],
          true
        );
        break;
      }
    }
  };

  return (
    <div className="relative h-full">
      <GanttComponent
        ref={ganttRef}
        includeWeekend={true}
        highlightWeekends={true}
        dataSource={[]}
        dateFormat="y-MM-dd"
        treeColumnIndex={1}
        allowSelection={true}
        showColumnMenu={false}
        allowUnscheduledTasks={true}
        taskFields={taskFields}
        timelineSettings={timelineSettings}
        timezone="UTC"
        splitterSettings={{ position: "50%" }}
        height="100%"
        editSettings={editSettings}
        gridLines="Both"
        toolbar={toolbar}
        labelSettings={{ rightLabel: "resources", taskLabel: "Progress" }}
        toolbarClick={onClickToolbar}
        showOverAllocation={visibleAllocation}
        resourceFields={resourceFields}
        resources={owners}
        allowResizing={true}
        workUnit="Hour"
        allowExcelExport={true}
        allowPdfExport={true}
        actionBegin={onBeforeAction}
        actionComplete={onAction}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" width="70"></ColumnDirective>
          <ColumnDirective
            field="TaskName"
            headerText="Task Name"
            width="300"
            clipMode="EllipsisWithTooltip"
            allowEditing={false}
          ></ColumnDirective>
          <ColumnDirective
            field="StartDate"
            visible={false}
            allowEditing={false}
          ></ColumnDirective>
          <ColumnDirective
            field="EndDate"
            visible={false}
            allowEditing={false}
          ></ColumnDirective>
          <ColumnDirective
            field="Progress"
            visible={false}
            allowEditing={false}
          ></ColumnDirective>
          <ColumnDirective
            field="resources"
            headerText="Resources"
            width={300}
            template={resourcesTemplate}
            clipMode="EllipsisWithTooltip"
          ></ColumnDirective>
          <ColumnDirective
            field="HoursCharged"
            headerText="HoursCharged"
            allowEditing={false}
            template={hoursChargedTemplate}
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="Duration"
            textAlign="Right"
            allowEditing={false}
          ></ColumnDirective>
          <ColumnDirective
            field="HoursLeft"
            headerText="HoursLeft"
            allowEditing={false}
            template={hoursLeftTemplate}
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="Milestone"
            headerText="Milestone"
            editType="dropdownedit"
            width="120"
            template={milestoneTemplate}
            edit={dropdownlist}
          ></ColumnDirective>
        </ColumnsDirective>
        <EditDialogFieldsDirective>
          <EditDialogFieldDirective
            type="General"
            headerText="General"
          ></EditDialogFieldDirective>
        </EditDialogFieldsDirective>
        <Inject
          services={[
            Edit,
            Selection,
            Toolbar,
            Resize,
            DayMarkers,
            ExcelExport,
            PdfExport,
          ]}
        />
      </GanttComponent>

      <Overlay visible={loading} border={true}>
        Loading...
      </Overlay>
    </div>
  );
};

export { ResourceAllocationTab };
