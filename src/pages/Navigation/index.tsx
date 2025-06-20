import { useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { Popover, Input, DatePicker, Select, message } from "antd";
import { Tabs, Tab, FormLabel, Button } from "../../components/common";
import {
  MainTab,
  ResourceAllocationTab,
  ResourceViewTab,
  KanbanTab,
  TaskTimelineTab,
  BaselineTab,
  CriticalPathTab,
  PerformanceTab,
} from "../../components/navigation";
import { Comment } from "../../layouts";
import { IconButton } from "../../components/common";
import { GlobalContext } from "../../lib/context";
import request from "../../lib/request";
import { sortProjectsFunc } from "../../lib/functions";
import dayjs from "dayjs";

const Navigation = () => {
  const { currentProject, setCurrentProject, projects, setProjects, owners } =
    useContext(GlobalContext);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tab = queryParams.get("tab");

  // Create Project
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [owner, setOwner] = useState<number>(0);
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // Edit Project
  const [setting, setSetting] = useState<any>({
    id: currentProject["project_id"],
    fromDate: currentProject["schedule_start_date"],
    toDate: currentProject["schedule_end_date"],
    owner: currentProject["project_owner"],
  });
  const [changed, setChanged] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Close Project
  const [closeLoading, setCloseLoading] = useState<boolean>(false);

  const onChangeProject = (value: number) => {
    const curProject =
      projects.find((r) => r["project_id"] == value) || projects[0];
    setCurrentProject(curProject);

    setSetting({
      id: curProject["project_id"],
      fromDate: curProject["schedule_start_date"],
      toDate: curProject["schedule_end_date"],
      owner: curProject["project_owner"],
    });
  };

  const onChangeStartDate = (_: any, dateString: string | string[]) => {
    if (typeof dateString === "string") {
      setSetting((prev: any) => ({ ...prev, fromDate: dateString }));
    } else if (dateString[0] && typeof dateString[0] === "string") {
      setSetting((prev: any) => ({ ...prev, fromDate: dateString[0] }));
    } else {
      setSetting((prev: any) => ({ ...prev, fromDate: null }));
    }

    setChanged(true);
  };

  const onChangeEndDate = (_: any, dateString: string | string[]) => {
    if (typeof dateString === "string") {
      setSetting((prev: any) => ({ ...prev, toDate: dateString }));
    } else if (dateString[0] && typeof dateString[0] === "string") {
      setSetting((prev: any) => ({ ...prev, toDate: dateString[0] }));
    } else {
      setSetting((prev: any) => ({ ...prev, toDate: null }));
    }

    setChanged(true);
  };

  const onChangeOwner = (value: number) => {
    setSetting((prev: any) => ({ ...prev, owner: value }));
    setChanged(true);
  };

  const onCreate = async () => {
    if (name.trim() === "") {
      message.error("Input the Project Name");
      return;
    }

    try {
      setCreateLoading(true);
      const result: any = await request.post("projects/create", {
        name,
        owner,
      });
      setProjects(result["projects"].sort(sortProjectsFunc));
      const createdProject = result["projects"].find(
        (r: any) => r["project_id"] == result["id"]
      );
      const curProj =
        createdProject || result["projects"].sort(sortProjectsFunc)[0];
      setCurrentProject(curProj);
      setSetting({
        id: curProj["project_id"],
        fromDate: curProj["schedule_start_date"],
        toDate: curProj["schedule_end_date"],
        owner: curProj["project_owner"],
      });
      setChanged(false);
      setIsOpen(false);
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  };

  const onSave = async () => {
    if (!changed) return;
    if (currentProject["project_status"] === "Closed") return;

    try {
      setSaveLoading(true);
      const result: any = await request.post("projects/update", setting);
      setProjects(result["projects"].sort(sortProjectsFunc));
      setChanged(false);
      setCurrentProject((prev: any) => ({
        ...prev,
        schedule_start_date: setting.fromDate,
        schedule_end_date: setting.toDate,
        project_owner: setting.owner,
      }));
      message.success("Success");
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setSaveLoading(false);
    }
  };

  const onClose = async () => {
    if (confirm("Closing the Project can not be undone, continue?")) {
      try {
        setCloseLoading(true);
        const result: any = await request.post("projects/close", {
          id: currentProject["project_id"],
        });
        setProjects(result["projects"].sort(sortProjectsFunc));
        setCurrentProject((prev: any) => ({
          ...prev,
          project_status: "Closed",
        }));
        message.success("Success");
      } catch (error: any) {
        message.error(error.message || "Something went wrong");
      } finally {
        setCloseLoading(false);
      }
    }
  };

  const createProjectContent = (
    <div style={{ width: 280 }}>
      <p className="mb-1">Project Name</p>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2"
        readOnly={createLoading}
      />

      <p className="mb-1">Project Owner</p>
      <Select value={owner} onChange={setOwner} className="mb-6 w-full">
        <Select.Option key={0} value={0}>
          No Owner
        </Select.Option>
        {owners.map((r: any) => (
          <Select.Option key={r["id"]} value={r["id"]}>
            {r["name"]}
          </Select.Option>
        ))}
      </Select>

      <Button loading={createLoading} onClick={onCreate} block>
        Create
      </Button>
    </div>
  );

  const content =
    tab === null ? (
      <MainTab />
    ) : tab === "resource_allocation" ? (
      <ResourceAllocationTab />
    ) : tab === "resource_view" ? (
      <ResourceViewTab />
    ) : tab === "kanban" ? (
      <KanbanTab />
    ) : tab === "tasktimeline" ? (
      <TaskTimelineTab />
    ) : tab === "baseline" ? (
      <BaselineTab />
    ) : tab === "critical_path" ? (
      <CriticalPathTab />
    ) : tab === "performance" ? (
      <PerformanceTab />
    ) : null;

  return (
    <div className="d-flex flex-column gap-2 pt-5 pb-4 h-full">
      <div className="d-flex justify-between items-center gap-2 nogrow noshrink">
        <div className="d-flex items-center">
          <FormLabel label="Project">
            <Select
              value={currentProject["project_id"]}
              onChange={onChangeProject}
              style={{ width: 260 }}
            >
              {projects.map((project: any) => (
                <Select.Option
                  key={project.project_id}
                  value={project.project_id}
                >
                  {project.project_status !== "Open" && (
                    <span className="text-warning">[Closed] </span>
                  )}
                  {project.project_name}
                </Select.Option>
              ))}
            </Select>
          </FormLabel>

          <Popover
            content={createProjectContent}
            title="Create Project"
            trigger="click"
            open={isOpen}
            onOpenChange={setIsOpen}
          >
            <IconButton tooltip="New Project">
              <img
                src="/icons/icon-new_project.svg"
                alt="New Project"
                width="20"
              />
            </IconButton>
          </Popover>
        </div>

        <div className="d-flex items-center gap-2">
          <FormLabel label="Schedule Start Date">
            <DatePicker
              value={
                dayjs(setting["fromDate"], "YYYY-MM-DD").isValid()
                  ? dayjs(setting["fromDate"], "YYYY-MM-DD")
                  : null
              }
              onChange={onChangeStartDate}
              disabled={currentProject["project_status"] === "Closed"}
              format={["YYYY-MM-DD"]}
            />
          </FormLabel>

          <FormLabel label="Schedule End Date">
            <DatePicker
              value={
                dayjs(setting["toDate"], "YYYY-MM-DD").isValid()
                  ? dayjs(setting["toDate"], "YYYY-MM-DD")
                  : null
              }
              onChange={onChangeEndDate}
              disabled={currentProject["project_status"] === "Closed"}
              format={["YYYY-MM-DD"]}
            />
          </FormLabel>

          <FormLabel label="Project Owner">
            <Select
              value={setting["owner"]}
              onChange={onChangeOwner}
              disabled={currentProject["project_status"] === "Closed"}
              style={{ width: 150 }}
            >
              <Select.Option value={0}>No Owner</Select.Option>
              {owners.map((owner: any) => (
                <Select.Option key={owner.id} value={owner.id}>
                  {owner.name}
                </Select.Option>
              ))}
            </Select>
          </FormLabel>

          {changed && (
            <Button onClick={onSave} loading={saveLoading}>
              Save
            </Button>
          )}

          {currentProject["project_status"] === "Open" && (
            <Button variant="danger" onClick={onClose} loading={closeLoading}>
              Close Project
            </Button>
          )}
        </div>
      </div>

      <div className="d-flex flex-column flex-auto overflow-hidden">
        <Tabs>
          <Tab href="/navigation" label="Main" active={tab === null} />
          <Tab
            href="/navigation?tab=resource_allocation"
            label="Resource Allocation"
            active={tab === "resource_allocation"}
          />
          <Tab
            href="/navigation?tab=resource_view"
            label="Resource View"
            active={tab === "resource_view"}
          />
          <Tab
            href="/navigation?tab=kanban"
            label="Kanban"
            active={tab === "kanban"}
          />
          <Tab
            href="/navigation?tab=tasktimeline"
            label="TaskTimeline"
            active={tab === "tasktimeline"}
          />
          <Tab
            href="/navigation?tab=baseline"
            label="Baseline"
            active={tab === "baseline"}
          />
          <Tab
            href="/navigation?tab=critical_path"
            label="Critical Path"
            active={tab === "critical_path"}
          />
          <Tab
            href="/navigation?tab=performance"
            label="Performance"
            active={tab === "performance"}
          />
        </Tabs>

        <div className="flex-auto overflow-auto">{content}</div>
      </div>

      <Comment />
    </div>
  );
};

export default Navigation;
