import { Link } from "react-router-dom";
import { Card, Button, Input } from "../../../components/common";

const SignUp = () => {
  return (
    <div className="d-flex flex-column justify-center items-center h-screen">
      <Card width={400} padding={40} className="mb-4">
        <p className="mb-6 text-center title">Create new account</p>
        <form>
          <p className="mb-2">Email</p>
          <Input type="text" name="email" mb={16} block />
          <p className="mb-2">Password</p>
          <Input type="password" name="password" mb={24} block />

          <Button type="submit" block>
            Create new account
          </Button>
        </form>
      </Card>
      <p className="text-secondary">
        Already have account?{" "}
        <Link to="/auth/signin" className="text-primary">
          SignIn
        </Link>
      </p>
    </div>
  );
};

export default SignUp;
