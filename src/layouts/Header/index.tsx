import { useContext } from "react";
import { Notification, ProfileButton } from "../../components/header";
import { Link } from "react-router-dom";
import { GlobalContext } from "../../lib/context";
import { IconButton } from "../../components/common";
import { IconHelp } from "@tabler/icons-react";

const Header = () => {
  const { profile } = useContext(GlobalContext);

  return (
    <header className="bg-white py-2 border-bottom">
      <div className="d-flex justify-between items-center h-5 container">
        <Link to="/">
          <img src="/images/logo.jpg" alt="" style={{ height: 20 }} />
        </Link>

        <div className="d-flex items-center">
          {profile["user_role"] === "Admin" && (
            <a href="/cxspsa/dashboard" className="mx-4 text-primary">
              Admin Workbench
            </a>
          )}

          <Notification />

          <IconButton>
            <IconHelp color="#666" size={18} />
          </IconButton>

          <ProfileButton />
        </div>
      </div>
    </header>
  );
};

export default Header;
