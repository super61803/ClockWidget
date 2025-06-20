import { Outlet } from "react-router-dom";
import { Navbar } from "../layouts";

const NavLayout = () => {
  return (
    <>
      <Navbar />
      <div
        className="overflow-hidden container"
        style={{ height: "calc(100vh - 76px)" }}
      >
        <Outlet />
      </div>
    </>
  );
};

export default NavLayout;
