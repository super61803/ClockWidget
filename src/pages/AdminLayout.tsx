import { useContext } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Header } from "../layouts";
import { HardNavigate } from "./HardNavigate";
import Loading from "./Loading";
import { GlobalContext } from "../lib/context";

const AdminLayout = () => {
  const { auth, loading } = useContext(GlobalContext);

  return loading ? (
    <Loading />
  ) : auth ? (
    <>
      <Header />
      <Outlet />
    </>
  ) : process.env.NODE_ENV === "production" ? (
    <HardNavigate to="/cxspsa/auth/signin" />
  ) : (
    <Navigate to="/auth/signin" />
  );
};

export default AdminLayout;
