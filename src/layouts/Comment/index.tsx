import { useEffect, useState, useContext, useRef } from "react";
import {
  RichTextEditorComponent,
  Toolbar,
  Inject,
  HtmlEditor,
  QuickToolbar,
  Table,
  FormatPainter,
  PasteCleanup,
} from "@syncfusion/ej2-react-richtexteditor";
import { MentionComponent } from "@syncfusion/ej2-react-dropdowns";
import { Drawer, message } from "antd";
import { GlobalContext } from "../../lib/context";
import { IconButton } from "../../components/common";
import { Button } from "../../components/common";
import { IconMessage2 } from "@tabler/icons-react";
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

const Comment = () => {
  const [open, setOpen] = useState(false);
  const { currentProject, owners, profile } = useContext(GlobalContext);
  const [comments, setComments] = useState<any[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const bottomRef = useRef<any>(null);
  var inputRef: RichTextEditorComponent | null;
  var mentionRef: any;
  const [loading, setLoading] = useState<boolean>(true);
  const [sendLoading, setSendLoading] = useState<boolean>(false);

  // Get Authors from Owners
  const authors: any = {};
  owners.forEach((r: any) => {
    authors[r["id"]] = r["name"];
  });

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
    if (!hasPermission) return;

    const prodOption = {
      cluster: "mt1",
      wsHost: window.location.hostname,
      wsPort: 80,
      wssPort: 443,
      enabledTransports: ["ws", "wss"],
      disableStats: true,
      forceTLS: true,
    };

    const devOption = {
      cluster: "mt1",
      wsHost: window.location.hostname,
      wsPort: 6001,
      forceTLS: false,
    };

    const pusher = new Pusher(
      "local",
      process.env.NODE_ENV === "production" ? prodOption : devOption
    );

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

  if (loading || !hasPermission) {
    return null;
  }

  return (
    <>
      <IconButton
        type="primary"
        onClick={() => {
          setOpen(true);

          // Move Scroll To Bottom
          setTimeout(() => {
            if (bottomRef && bottomRef.current) {
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          }, 300);
        }}
        className={styles.btn}
      >
        <IconMessage2 />
      </IconButton>

      <Drawer
        title="Comments"
        width={500}
        closeIcon={null}
        forceRender={true}
        loading={loading}
        onClose={() => setOpen(false)}
        open={open}
      >
        {open && (
          <div className="d-flex flex-column h-full">
            <div className="flex-auto mb-4 px-4 py-2 border overflow-auto">
              {comments.map((r: any) => (
                <CommentItem
                  key={r["id"]}
                  author={
                    profile["id"] === r["user_id"] ? "You" : r["user_name"]
                  }
                  name={r["user_name"]}
                  content={r["html_text"]}
                  datetime={r["datetime"]}
                />
              ))}
              <div ref={bottomRef}></div>
            </div>

            <RichTextEditorComponent
              ref={(ref) => (inputRef = ref)}
              height={160}
              id="mention_layout"
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
              target="#mention_layout_rte-edit-view"
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
              className="nogrow noshrink"
              loading={sendLoading}
              onClick={onSend}
            >
              Comment
            </Button>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default Comment;
