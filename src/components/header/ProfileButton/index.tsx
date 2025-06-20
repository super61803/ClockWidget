import { useContext } from "react";
import { Popover } from "antd";
import { Button } from "../../common";
import { IconCaretDownFilled } from "@tabler/icons-react";
import { GlobalContext } from "../../../lib/context";
import request from "../../../lib/request";

const ProfileButton = () => {
  const { setAuth, profile, setProfile } = useContext(GlobalContext);

  const onLogout = () => {
    request.clearToken();
    setAuth(false);
    setProfile({});
  };

  const content = (
    <div className="d-flex flex-column" style={{ width: 140 }}>
      {/* <Button
        href="#"
        className="px-0! text-left"
        outline={true}
        hasBorder={false}
      >
        Knowledgebase
      </Button>
      <Button
        href="#"
        className="px-0! text-left"
        outline={true}
        hasBorder={false}
      >
        Subscription Info
      </Button>
      <Button
        href="#"
        className="px-0! text-left"
        outline={true}
        hasBorder={false}
      >
        My Login History
      </Button> */}
      <Button
        onClick={onLogout}
        className="px-0! text-left"
        outline={true}
        hasBorder={false}
      >
        Logout
      </Button>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <div className="d-flex items-center gap-1 py-2 pl-2">
        <div className="cursor-pointer">{profile.full_name}</div>
        <IconCaretDownFilled size={16} color="#666" />
      </div>
    </Popover>
  );
};

export { ProfileButton };
