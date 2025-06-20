import { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import {
  RichTextEditorComponent,
  Toolbar,
  Inject,
  HtmlEditor,
  Table,
  FormatPainter,
  PasteCleanup,
  QuickToolbar,
} from "@syncfusion/ej2-react-richtexteditor";
import { MentionComponent } from "@syncfusion/ej2-react-dropdowns";
import { FormLabel, Button } from "../../components/common";
import { Select, message } from "antd";
import { GlobalContext } from "../../lib/context";
import { IconBan } from "@tabler/icons-react";
import Pusher from "pusher-js";
import request from "../../lib/request";
import { getAbbreviation } from "../../lib/functions";
import moment from "moment";
import styles from "./styles.module.css";

interface CommentProps {
  author: string;
  name: string;
  content: string;
  datetime: string;
}

const CommentItem = ({ author, name, content, datetime }: CommentProps) => {
  return (
    <div className="mb-4">
      <div className="d-flex gap-2">
        <div className="basis-10 nogrow noshrink">
          <div className="d-grid-center bg-light border w-9 h-9 round-6">
            {getAbbreviation(name)}
          </div>
        </div>
        <div className="flex-auto">
          <p>
            <b>{author}</b>
          </p>
          <div dangerouslySetInnerHTML={{ __html: content }}></div>
          <span className="font-12 text-secondary">
            {moment(datetime).fromNow()}
          </span>
        </div>
      </div>
    </div>
  );
};

const Collaboration = () => {
  const { currentProject, setCurrentProject, projects, owners, profile } =
    useContext(GlobalContext);
  const [comments, setComments] = useState<any[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const bottomRef = useRef<any>(null);
  var inputRef: RichTextEditorComponent | null;
  var mentionRef: any;
  const [loading, setLoading] = useState<boolean>(true);
  const [sendLoading, setSendLoading] = useState<boolean>(false);

  const itemTemplate = (item: any) => {
    return (
      <div className={styles["mention-container"]}>
        <div>
          <div className={styles["mention-avatar"]}>
            {getAbbreviation(item.name)}
          </div>
        </div>
        <div className={styles["mention-content"]}>
          <p className={styles["mention-name"]}>{item.name}</p>
          <p className={styles["mention-email"]}>{item.email}</p>
        </div>
      </div>
    );
  };

  const displayTemplate = (item: any) => {
    return (
      <a href={`mailto:${item.email}`} title={item.email}>
        @{item.name}
      </a>
    );
  };

  const items = [
    "Bold",
    "Italic",
    "Underline",
    "StrikeThrough",
    "|",
    "FontColor",
    "BackgroundColor",
    "|",
    "NumberFormatList",
    "BulletFormatList",
  ];

  useEffect(() => {
    if (!hasPermission) {
      return;
    }

    const pusher = new Pusher("local", {
      cluster: "mt1",
      wsHost: window.location.hostname,
      wsPort: 6001,
      forceTLS: false,
    });

    const channel = pusher.subscribe("chat");
    channel.bind("App\\Events\\MessageEvent", ({ message }: any) => {
      setComments((prev: any) => [...prev, JSON.parse(message)]);

      // Move Scroll To Bottom
      setTimeout(() => {
        if (bottomRef && bottomRef.current) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [hasPermission]);

  useEffect(() => {
    if (!currentProject["project_id"]) {
      setLoading(false);
      setHasPermission(false);
      return;
    }

    (async function () {
      try {
        setLoading(true);
        const result: any = await request.post("comments/get", {
          id: currentProject["project_id"],
        });
        setHasPermission(result["hasPermission"]);

        if (result["hasPermission"]) {
          setComments(result["data"]);

          // Move Scroll To Bottom
          setTimeout(() => {
            if (bottomRef && bottomRef.current) {
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          }, 300);
        }
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

  const onChangeProject = (value: number) => {
    setCurrentProject(
      projects.find((r) => r["project_id"] == value) || projects[0]
    );
  };

  const onSend = async () => {
    if (!inputRef) return;

    const text = inputRef.getText();
    const htmlText = inputRef.getHtml();

    if (text.trim() === "") {
      return;
    }

    try {
      setSendLoading(true);
      inputRef.value = "";
      await request.post("comments/add", {
        text,
        htmlText,
        projectId: currentProject["project_id"],
      });
    } catch (error: any) {
      message.error(error.message || "Something went wrong");
    } finally {
      setSendLoading(false);
    }
  };

  const onActionBegin = (args: any) => {
    if (
      args.requestType === "EnterAction" &&
      mentionRef.element.classList.contains("e-popup-open")
    ) {
      args.cancel = true;
    }
  };

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

      {loading && (
        <div className="flex-auto">
          <div className="d-grid-center h-full">Loading...</div>
        </div>
      )}

      {!loading && !hasPermission && (
        <div className="flex-auto">
          <div className="d-flex flex-column justify-center items-center gap-2 h-full">
            <p className="d-flex items-center gap-1">
              <IconBan size={16} color="#f00" />
              You're Not Assigned To This Project.
            </p>
            <Link to="/navigation" className="text-secondary underline">
              Go Back
            </Link>
          </div>
        </div>
      )}

      {!loading && hasPermission && (
        <>
          <div className="flex-auto bg-white mb-4 p-4 border overflow-auto round-4">
            {comments.map((r: any) => (
              <CommentItem
                key={r["id"]}
                author={profile["id"] === r["user_id"] ? "You" : r["user_name"]}
                name={r["user_name"]}
                content={r["html_text"]}
                datetime={r["datetime"]}
              />
            ))}
            <div ref={bottomRef}></div>
          </div>

          <div className="relative nogrow noshrink">
            <RichTextEditorComponent
              ref={(ref) => (inputRef = ref)}
              height={200}
              id="mention_integration"
              toolbarSettings={{ items: items }}
              actionBegin={onActionBegin}
            >
              <Inject
                services={[
                  Toolbar,
                  HtmlEditor,
                  Table,
                  FormatPainter,
                  PasteCleanup,
                  QuickToolbar,
                ]}
              />
            </RichTextEditorComponent>

            <MentionComponent
              ref={(ref) => (mentionRef = ref)}
              target="#mention_integration_rte-edit-view"
              suggestionCount={999}
              showMentionChar={false}
              allowSpaces={true}
              dataSource={owners}
              fields={{ text: "name" }}
              popupWidth="250px"
              popupHeight="200px"
              itemTemplate={itemTemplate}
              displayTemplate={displayTemplate}
            ></MentionComponent>

            <Button
              className="right-4 bottom-4 z-10 absolute"
              loading={sendLoading}
              onClick={onSend}
            >
              Comment
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Collaboration;
