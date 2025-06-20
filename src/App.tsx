import { useRoutes } from "react-router-dom";

// Layouts
import AdminLayout from "./pages/AdminLayout";
import AuthLayout from "./pages/AuthLayout";
import NavLayout from "./pages/NavLayout";

// Pages
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Dashboard from "./pages/Dashboard";
import Navigation from "./pages/Navigation";
import Collaboration from "./pages/Collaboration";
import Requirements from "./pages/Requirements";
import Requirement from "./pages/Requirement";
import Assumptions from "./pages/Assumptions";
import Assumption from "./pages/Assumption";
import ProjectDocuments from "./pages/ProjectDocuments";
import NotFound from "./pages/NotFound";

const App = () => {
  const routes = [
    {
      path: "",
      element: <AdminLayout />,
      children: [
        { path: "", element: <Dashboard /> },
        {
          path: "",
          element: <NavLayout />,
          children: [
            { path: "navigation", element: <Navigation /> },
            { path: "collaboration", element: <Collaboration /> },
            { path: "requirements", element: <Requirements /> },
            { path: "requirements/:id", element: <Requirement /> },
            { path: "assumptions", element: <Assumptions /> },
            { path: "assumptions/:id", element: <Assumption /> },
            { path: "project_documents", element: <ProjectDocuments /> },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <NotFound />,
    },
  ];

  if (process.env.NODE_ENV !== "production") {
    routes.push({
      path: "/auth",
      element: <AuthLayout />,
      children: [
        { path: "signin", element: <SignIn /> },
        { path: "signup", element: <SignUp /> },
      ],
    });
  }

  return useRoutes(routes);
};

export default App;
