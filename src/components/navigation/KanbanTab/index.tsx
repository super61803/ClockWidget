import { useContext, useEffect, useState } from "react";
import { message } from "antd";
import {
  KanbanComponent,
  ColumnsDirective,
  ColumnDirective,
} from "@syncfusion/ej2-react-kanban";
import { Overlay } from "../../common";
import request from "../../../lib/request";
import { GlobalContext } from "../../../lib/context";
import { MILESTONES } from "../../../lib/constants";
import {
  IconMenu2,
  IconLoader,
  IconEye,
  IconRocket,
  IconCheck,
} from "@tabler/icons-react";

const KanbanTab = () => {
  const { currentProject, owners } = useContext(GlobalContext);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const processData = (tasks: any[]) => {
    const out: any[] = [];

    const resourceMap: any = {};

    owners.forEach((owner: any) => {
      resourceMap[owner.id] = owner.name;
    });

    tasks.forEach((task: any) => {
      if (!task["Resources"]) {
        out.push({ ...task, Resources: "Unassigned" });
      } else {
        const resources = task["Resources"].split(",");
        resources.forEach((r: string) => {
          out.push({
            ...task,
            Resources: resourceMap[r],
          });
        });
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
      setTasks(processData(result["tasks"]));
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

  const columnTemplate = (props: any) => {
    const columnIcons: any = {
      Planned: (
        <div className="bg-secondary icon">
          <IconMenu2 size={16} />
        </div>
      ),
      "In Process": (
        <div className="bg-warning icon">
          <IconLoader size={16} />
        </div>
      ),
      "In Testing": (
        <div className="bg-primary icon">
          <IconEye size={16} />
        </div>
      ),
      Deployment: (
        <div className="bg-danger icon">
          <IconRocket size={16} />
        </div>
      ),
      Complete: (
        <div className="bg-success icon">
          <IconCheck size={16} />
        </div>
      ),
    };

    return (
      <div className="kanban-header">
        {columnIcons[props.headerText]}
        <div>{props.headerText}</div>
      </div>
    );
  };

  const rowTemplate = (props: any) => {
    return <p className="kanban-item">{props.textField}</p>;
  };

  const onOpen = (args: any) => {
    args.cancel = true;
  };

  return (
    <div className="relative bg-white p-2 border h-full overflow-auto">
      <KanbanComponent
        keyField="Milestone"
        allowDragAndDrop={false}
        height="100%"
        dataSource={tasks}
        cardSettings={{ contentField: "TaskName", headerField: "TaskNumber" }}
        dialogOpen={onOpen}
        swimlaneSettings={{
          keyField: "Resources",
          template: rowTemplate,
        }}
      >
        <ColumnsDirective>
          {MILESTONES.map((r: string) => (
            <ColumnDirective
              key={r}
              headerText={r}
              allowToggle={true}
              keyField={r}
              template={columnTemplate}
              showItemCount={false}
            />
          ))}
        </ColumnsDirective>
      </KanbanComponent>

      <Overlay visible={loading}>Loading...</Overlay>

      <Overlay visible={!tasks.length}>No Task</Overlay>
    </div>
  );
};

export { KanbanTab };
