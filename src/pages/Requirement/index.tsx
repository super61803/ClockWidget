import { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DocumentEditorContainerComponent,
  Toolbar,
} from "@syncfusion/ej2-react-documenteditor";
import { Dropdown, Input, message, Select } from "antd";
import type { MenuProps } from "antd";
import { FormLabel, Button } from "../../components/common";
import {
  IconDotsVertical,
  IconLock,
  IconLockOpen,
  IconTrash,
  IconDownload,
} from "@tabler/icons-react";
import { SEVERITIES } from "../../lib/constants";
import { GlobalContext } from "../../lib/context";
import request from "../../lib/request";

DocumentEditorContainerComponent.Inject(Toolbar);

const Requirement = () => {
  const { currentProject } = useContext(GlobalContext);
  const [locked, setLocked] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [reqId, setReqId] = useState<string>("");
  const [severity, setSeverity] = useState<string>(SEVERITIES[0]);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { id }: any = useParams();

  const blobToText = (blob: Blob) => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsText(blob);
    });
  };

  const fetchRequirement = async (reqId: string) => {
    if (!currentProject["project_id"]) {
      return;
    }

    try {
      if (reqId === "create") {
        setReqId("");
        setTitle("");
        setSeverity(SEVERITIES[0]);
        setLocked(false);
        if (editorRef.current) {
          editorRef.current?.refresh();
        }
        return;
      }

      const result: any = await request.post("requirements/get", {
        reqId,
        projId: currentProject["project_id"],
      });

      if (result["req_id"]) {
        setReqId(result["req_id"]);
        setTitle(result["req_title"]);
        setSeverity(result["severity"]);
        if (editorRef.current) {
          editorRef.current?.documentEditor.open(result["content"]);
        }
      } else {
        message.error("Invalid Requirement");
        navigate("/requirements/create");
      }
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    }
  };

  const onDownload = () => {
    if (editorRef.current) {
      if (!title) {
        message.error("Input title");
        return;
      }

      editorRef.current?.documentEditor.save(title, "Docx");
    }
  };

  const onToggleLock = () => {
    if (editorRef.current && editorRef.current.documentEditor) {
      editorRef.current.documentEditor.isReadOnly = !locked;
      setLocked((prev) => !prev);
    }
  };

  const onDelete = async () => {
    try {
      setSaveLoading(true);
      await request.post("requirements/delete", { reqId });
      navigate("/requirements/create");
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setSaveLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!title || title.trim() === "") {
      message.error("Title cannot be empty");
      return;
    }

    if (!editorRef.current) return;

    const blob = await editorRef.current?.documentEditor?.saveAsBlob("Sfdt");
    const content = await blobToText(blob);

    try {
      setSaveLoading(true);

      if (id === "create") {
        const response: any = await request.post("requirements/create", {
          title,
          projId: currentProject["project_id"],
          content,
          severity,
        });
        navigate(`/requirements/${response["req_id"]}`);
      } else {
        await request.post("requirements/update", {
          reqId,
          title,
          projId: currentProject["project_id"],
          severity,
          content,
        });
      }
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setSaveLoading(false);
    }
  };

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <div onClick={onDownload} style={{ width: 80 }}>
          Download
        </div>
      ),
      icon: <IconDownload color="#666" size={20} />,
    },
    {
      key: "2",
      label: (
        <div onClick={onToggleLock} style={{ width: 80 }}>
          {locked ? "Unlock" : "Lock"}
        </div>
      ),
      icon: locked ? (
        <IconLockOpen color="#666" size={20} />
      ) : (
        <IconLock color="#666" size={20} />
      ),
    },
    {
      key: "3",
      label: (
        <div onClick={onDelete} style={{ width: 80 }}>
          Delete
        </div>
      ),
      icon: <IconTrash color="#666" size={20} />,
    },
  ];

  useEffect(() => {
    if (editorRef.current && editorRef.current.documentEditor) {
      // editorRef.current.documentEditor.documentName = "title here";
      editorRef.current.documentEditor.pageOutline = "#E0E0E0";
      editorRef.current.documentEditor.acceptTab = true;
      editorRef.current.documentEditor.resize();
      editorRef.current.documentChange = () => {
        editorRef.current?.documentEditor.focusIn();
      };
    }

    fetchRequirement(id);
  }, [id]);

  let editorRef = useRef<DocumentEditorContainerComponent>(null);

  if (!currentProject["project_id"]) {
    return null;
  }

  return (
    <div className="d-flex flex-column py-4 h-full overflow-hidden">
      <p className="mb-6 text-secondary nogrow noshrink title">
        {currentProject["project_name"]}
      </p>

      <div className="d-flex justify-between items-center mb-4 nogrow noshrink">
        <div className="d-flex items-center gap-2">
          {id !== "create" && (
            <FormLabel label="REQ ID">
              <Input value={reqId} disabled={true} />
            </FormLabel>
          )}
          <FormLabel label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={locked ? true : saveLoading}
            />
          </FormLabel>
          <FormLabel label="Severity">
            <Select
              value={severity}
              onChange={setSeverity}
              style={{ width: 180 }}
              disabled={locked ? true : saveLoading}
            >
              {SEVERITIES.map((r: string) => (
                <Select.Option key={r} value={r}>
                  {r}
                </Select.Option>
              ))}
            </Select>
          </FormLabel>
          {!locked && (
            <Button onClick={onSubmit} loading={saveLoading}>
              {id === "create" ? "Create" : "Save"}
            </Button>
          )}
        </div>

        {id !== "create" && (
          <Dropdown
            menu={{ items }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <div className="d-grid-center w-8 h-8 text-secondary cursor-pointer round-6">
              <IconDotsVertical size={20} />
            </div>
          </Dropdown>
        )}
      </div>

      <div className="flex-auto overflow-auto">
        <DocumentEditorContainerComponent
          ref={editorRef}
          height="100%"
          serviceUrl="https://services.syncfusion.com/react/production/api/documenteditor/"
          enableToolbar={true}
          locale="en-US"
        />
      </div>
    </div>
  );
};

export default Requirement;
