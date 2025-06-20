import { useContext } from "react";
import { GlobalContext } from "../lib/context";
import { Outlet, Navigate } from "react-router-dom";

const AuthLayout = () => {
  const { auth } = useContext(GlobalContext);

  return auth ? (
    <Navigate to="/" />
  ) : (
    <div className="container">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
