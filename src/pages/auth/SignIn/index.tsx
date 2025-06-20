import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, Input } from "../../../components/common";
import { GlobalContext } from "../../../lib/context";
import { IconMail, IconLock } from "@tabler/icons-react";
import { sortProjectsFunc } from "../../../lib/functions";
import request from "../../../lib/request";

type FieldType = {
  email: string;
  password: string;
  other: string;
};

const emptyProject: any = {
  project_id: null,
  project_name: "",
  schedule_start_date: null,
  schedule_end_date: null,
  project_status: "Closed",
  project_owner: 0,
};

const SignIn = () => {
  const { setAuth, setCurrentProject, setProjects, setProfile, setOwners } =
    useContext(GlobalContext);
  const [error, setError] = useState<FieldType>({
    email: "",
    password: "",
    other: "",
  });
  const [loading, setLoading] = useState<boolean>(false);

  const onSubmit = async (e: any) => {
    e.preventDefault();

    const payload = {
      email: e.target.elements.email.value || "",
      password: e.target.elements.password.value || "",
    };

    try {
      setLoading(true);
      const result: any = await request.post("auth/login", payload);
      setError({ email: "", password: "", other: "" });
      request.setToken(result.token);
      setAuth(true);
      setProfile(result.user);
      setProjects(result.projects.sort(sortProjectsFunc));
      setCurrentProject(result.projects[0] || emptyProject);
      setOwners(result.owners);
    } catch (error: any) {
      if (error.target && error.target.trim() !== "") {
        setError({
          email: "",
          password: "",
          other: "",
          [error.target]: error.message,
        });
      } else {
        setError({
          email: "",
          password: "",
          other: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column justify-center items-center h-screen">
      <Card width={400} padding={40} className="mb-2">
        <img
          src="/images/logo.jpg"
          alt=""
          className="mb-4"
          style={{ width: 120 }}
        />
        <p className="mb-6 text-center title">Login to your account</p>
        <form onSubmit={onSubmit}>
          <p className="mb-2">Email</p>
          <Input
            type="text"
            name="email"
            mb={16}
            prefix={<IconMail size={18} color="#666" />}
            error={error["email"]}
            block
          />
          <p className="mb-2">Password</p>
          <Input
            type="password"
            name="password"
            mb={24}
            prefix={<IconLock size={18} color="#666" />}
            error={error["password"]}
            block
          />

          {error["other"] && (
            <div className="bg-danger mb-6 px-4 py-3 text-white">
              {error["other"]}
            </div>
          )}

          <Button type="submit" loading={loading} block>
            Sign in
          </Button>
        </form>
      </Card>
      <Link to="#" className="mb-2 text-center text-primary">
        Password Help
      </Link>
      <p className="text-secondary">
        Don't have account?{" "}
        <Link to="/auth/signup" className="text-primary">
          Create an Account
        </Link>
      </p>
    </div>
  );
};

export default SignIn;
