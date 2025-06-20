import { useContext, useEffect, useState, useRef } from "react";
import { message } from "antd";
import {
  GanttComponent,
  DayMarkers,
  EditDialogFieldsDirective,
  EditDialogFieldDirective,
  AddDialogFieldsDirective,
  AddDialogFieldDirective,
  Inject,
  Edit,
  Resize,
  RowDD,
  Selection,
  Toolbar,
  ContextMenu,
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

const MainTab = () => {
  const ganttRef = useRef<GanttComponent>(null);
  const { currentProject } = useContext(GlobalContext);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleAllocation, setVisibleAllocation] = useState<boolean>(true);

  const processData = (tasks: any[]) => {
    const taskMap: any = {};

    tasks.sort((a: any, b: any) => a.TaskIndex - b.TaskIndex);

    tasks.forEach((task: any, index) => {
      task.subtasks = [];

      // Set ScheduleDate, ActualDate
      task.ActualStartDate = task.ActualStartDate
        ? new Date(task.ActualStartDate)
        : null;
      task.ActualEndDate = task.ActualEndDate
        ? new Date(task.ActualEndDate)
        : null;
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

  const serializeTasks = (tasks: any[]) => {
    const out: any[] = [];

    tasks.forEach((task: any) => (task.ParentTaskId = 0));

    const serialize = (tasks: any[]) => {
      tasks.forEach((task: any) => {
        out.push(task);

        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((r: any) => {
            r.ParentTaskId = task.TaskID;
            r.NewParent = task.New || false;
          });
          serialize(task.subtasks);
        }
      });
    };

    serialize(tasks);
    return out.map((r: any, index: number) => ({
      TaskID: r.TaskID,
      TaskName: r.TaskName,
      TaskNumber: r.TaskNumber,
      TaskIndex: index,
      ActualStartDate: r.ActualStartDate,
      ActualEndDate: r.ActualEndDate,
      StartDate: r.StartDate,
      EndDate: r.EndDate,
      Milestone: r.Milestone,
      ParentTaskId: r.ParentTaskId,
      Predecessor: r.Predecessor,
      Progress: r.Progress,
      Resources: r.Resources,
      New: r.New || false,
      NewParent: r.NewParent || false,
    }));
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

      const result: any = await request.post("tasks/update", {
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
    progress: "Progress",
    dependency: "Predecessor",
    child: "subtasks",
    actualStartDate: "ActualStartDate",
    actualEndDate: "ActualEndDate",
  };
  const editSettings = {
    allowAdding: currentProject["project_status"] === "Open",
    allowEditing: currentProject["project_status"] === "Open",
    allowDeleting: currentProject["project_status"] === "Open",
    allowTaskbarEditing: currentProject["project_status"] === "Open",
    showDeleteConfirmDialog: currentProject["project_status"] === "Open",
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
    "Add",
    "Edit",
    "Update",
    "Delete",
    "Cancel",
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
      text: "View Mode",
      tooltipText: "View Mode",
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

  const contextMenuItems: any = [
    "TaskInformation",
    "Add",
    "Save",
    "Cancel",
    "DeleteTask",
    "DeleteDependency",
    "Indent",
    "Outdent",
  ];

  const progressTemplate = (props: any) => {
    return props.taskData.Progress + "%";
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

  const onBeforeAction = async (args: any) => {
    switch (args.requestType) {
      case "beforeAdd":
        args.newTaskData.New = true;
        break;
      case "beforeOpenAddDialog":
        args.rowData.TaskName = "New Task";
        break;
    }
  };

  const onAction = async (args: any) => {
    switch (args.requestType) {
      case "add":
      case "save":
      case "delete":
      case "indented":
      case "outdented":
      case "rowDropped":
        ganttRef.current?.toolbarModule.enableItems(
          ["save_changes", "reset_changes"],
          true
        );
        break;
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
        labelSettings={{ rightLabel: "TaskName", taskLabel: "Progress" }}
        enableContextMenu={true}
        allowRowDragAndDrop={true}
        allowResizing={true}
        contextMenuItems={contextMenuItems}
        toolbarClick={onClickToolbar}
        showOverAllocation={visibleAllocation}
        allowExcelExport={true}
        allowPdfExport={true}
        actionBegin={onBeforeAction}
        actionComplete={onAction}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" width="50"></ColumnDirective>
          <ColumnDirective
            field="TaskName"
            headerText="Task Name"
            width="300"
            clipMode="EllipsisWithTooltip"
          ></ColumnDirective>
          <ColumnDirective
            field="StartDate"
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective field="EndDate" textAlign="Right"></ColumnDirective>
          <ColumnDirective field="Duration" textAlign="Right"></ColumnDirective>
          <ColumnDirective
            field="ActualStartDate"
            editType="datepickeredit"
            format={{ type: "date", format: "y-MM-dd" }}
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="ActualEndDate"
            editType="datepickeredit"
            format={{ type: "date", format: "y-MM-dd" }}
            textAlign="Right"
          ></ColumnDirective>
          <ColumnDirective
            field="Progress"
            textAlign="Right"
            template={progressTemplate}
          ></ColumnDirective>
          <ColumnDirective field="Predecessor"></ColumnDirective>
        </ColumnsDirective>
        <AddDialogFieldsDirective>
          <AddDialogFieldDirective
            type="Custom"
            headerText="General"
            fields={[
              "TaskName",
              "Progress",
              "StartDate",
              "EndDate",
              "ActualStartDate",
              "ActualEndDate",
            ]}
          ></AddDialogFieldDirective>
          <AddDialogFieldDirective type="Dependency"></AddDialogFieldDirective>
        </AddDialogFieldsDirective>
        <EditDialogFieldsDirective>
          <EditDialogFieldDirective
            type="Custom"
            headerText="General"
            fields={[
              "TaskName",
              "Progress",
              "StartDate",
              "EndDate",
              "ActualStartDate",
              "ActualEndDate",
            ]}
          ></EditDialogFieldDirective>
          <EditDialogFieldDirective type="Dependency"></EditDialogFieldDirective>
        </EditDialogFieldsDirective>
        <Inject
          services={[
            Edit,
            Selection,
            Toolbar,
            Resize,
            RowDD,
            DayMarkers,
            ContextMenu,
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

export { MainTab };
