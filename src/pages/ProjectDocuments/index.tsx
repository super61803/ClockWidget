import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Select, message } from "antd";
import { FormLabel } from "../../components/common";
import {
  FileManagerComponent,
  Inject,
  NavigationPane,
  DetailsView,
  Toolbar,
  FileData,
} from "@syncfusion/ej2-react-filemanager";
import { DocumentEditorContainerComponent } from "@syncfusion/ej2-react-documenteditor";
import { GlobalContext } from "../../lib/context";
import request from "../../lib/request";

const ProjectDocuments = () => {
  const fmRef = useRef<FileManagerComponent>(null);
  const { currentProject, setCurrentProject, projects } =
    useContext(GlobalContext);
  const [loading, setLoading] = useState<boolean>(true);

  const editorRef = useRef<DocumentEditorContainerComponent>(null);

  const onChangeProject = (value: number) => {
    setCurrentProject(
      projects.find((r) => r["project_id"] == value) || projects[0]
    );
  };

  const folders = [
    {
      hasChild: true,
      id: "0",
      isFile: false,
      name: currentProject["project_name"],
      parentId: undefined,
      type: "folder",
    },
    {
      hasChild: false,
      id: "1",
      isFile: false,
      name: "Requirements",
      parentId: "0",
      type: "folder",
    },
    {
      hasChild: false,
      id: "2",
      isFile: false,
      name: "Assumptions",
      parentId: "0",
      type: "folder",
    },
  ];
  const [data, setData] = useState<FileData[]>(folders);
  const navigate = useNavigate();

  const onOpenFile = async ({ fileDetails }: any) => {
    if (!fileDetails.isFile) return;

    const url = `/${fileDetails["category"]}/${fileDetails["docId"]}`;

    navigate(url);
  };

  const onSelectFile = ({ fileDetails }: any) => {
    if (fileDetails.isFile) {
      fmRef.current?.enableToolbarItems(["CopyLink", "Export"]);
    } else {
      fmRef.current?.disableToolbarItems(["CopyLink", "Export"]);
    }
  };

  const onToolbarClick = ({
    fileDetails,
    item,
  }: {
    fileDetails: any[];
    item: any;
  }) => {
    if (!fileDetails[0] || fileDetails[0]["isFile"] === false) {
      return;
    }

    if (item.properties.text === "CopyLink") {
      const link = `${process.env.REACT_APP_FRONTEND_URL || ""}${
        process.env.REACT_APP_BASE_URL || ""
      }/${fileDetails[0]["category"]}/${fileDetails[0]["docId"]}`;

      navigator.clipboard.writeText(link);

      message.success("Copied");
    } else if (
      item.properties.text === "Export" &&
      editorRef.current !== null
    ) {
      editorRef.current?.documentEditor.open(fileDetails[0]["content"]);
      editorRef.current?.documentEditor.save(fileDetails[0]["name"], "Docx");
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
        const result: any = await request.post("projects/documents", {
          id: currentProject["project_id"],
        });
        setData([
          ...folders,
          ...result["requirements"].map((r: any) => ({
            hasChild: false,
            docId: r["req_id"],
            isFile: true,
            name: r["req_title"],
            parentId: "1",
            type: ".docx",
            category: "requirements",
            content: r["content"],
            createdBy: r["created_by"] || "",
            createdAt: r["creation_date"] || "",
            updatedBy: r["last_updated_by"] || "",
            updatedAt: r["last_update_date"] || "",
          })),
          ...result["assumptions"].map((r: any) => ({
            hasChild: false,
            docId: r["assumption_id"],
            isFile: true,
            name: r["assumption_title"],
            parentId: "2",
            type: ".docx",
            category: "assumptions",
            content: r["content"],
            createdBy: r["created_by"] || "",
            createdAt: r["creation_date"] || "",
            updatedBy: r["last_updated_by"] || "",
            updatedAt: r["last_update_date"] || "",
          })),
        ]);
      } catch (error: any) {
        message.error(error.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [
    currentProject["project_id"],
    currentProject["schedule_start_date"],
    currentProject["schedule_end_date"],
  ]);

  if (loading) {
    return <div className="d-grid-center h-full">Loading...</div>;
  }

  return (
    <div className="d-flex flex-column pt-6 pb-4 h-full overflow-hidden">
      <FormLabel label="Project" className="mb-4">
        <Select
          value={currentProject["project_id"]}
          onChange={onChangeProject}
          style={{ width: 200 }}
        >
          {projects.map((project: any) => (
            <Select.Option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </Select.Option>
          ))}
        </Select>
      </FormLabel>

      <div className="flex-auto overflow-hidden">
        <FileManagerComponent
          ref={fmRef}
          id="psa-fm"
          fileSystemData={data as any}
          toolbarSettings={{ items: ["CopyLink", "Export"] }}
          toolbarClick={onToolbarClick}
          contextMenuSettings={{ visible: false }}
          fileOpen={onOpenFile}
          fileSelect={onSelectFile}
          fileDropped={() => false}
          allowDragAndDrop={false}
          height="100%"
          showItemCheckBoxes={false}
          detailsViewSettings={{
            columns: [
              {
                field: "name",
                headerText: "Title",
                width: "250px",
                allowSorting: true,
              },
              {
                field: "docId",
                headerText: "ID",
                width: "100px",
                allowSorting: true,
              },
              {
                field: "createdBy",
                headerText: "Created By",
                width: "100px",
                allowSorting: true,
              },
              {
                field: "createdAt",
                headerText: "Created At",
                width: "100px",
                allowSorting: true,
              },
              {
                field: "updatedBy",
                headerText: "Updated By",
                width: "100px",
                allowSorting: true,
              },
              {
                field: "updatedAt",
                headerText: "Updated At",
                width: "100px",
                allowSorting: true,
              },
            ],
          }}
          view="Details"
          allowMultiSelection={false}
        >
          <Inject services={[NavigationPane, DetailsView, Toolbar]} />
        </FileManagerComponent>
      </div>

      <div
        style={{
          display: "none",
          height: "0px",
          width: "0px",
          overflow: "hidden",
          flexGrow: 0,
          flexShrink: 0,
        }}
      >
        <DocumentEditorContainerComponent
          ref={editorRef}
          height="0px"
          serviceUrl="https://services.syncfusion.com/react/production/api/documenteditor/"
          enableToolbar={false}
          locale="en-US"
        />
      </div>
    </div>
  );
};

export default ProjectDocuments;
