import {
  Dispatch,
  SetStateAction,
  useState,
  useLayoutEffect,
  createContext,
} from "react";
import { sortProjectsFunc } from "./functions";
import request from "./request";

const defaultAuth = false;
const defaultLoading = true;
const defaultToken: string | null = null;
const defaultProfile: any = {};
const defaultCurrentProject = {};
const defaultProjects: any[] = [];
const defaultOwners: any[] = [];
const emptyProject: any = {
  project_id: null,
  project_name: "",
  schedule_start_date: null,
  schedule_end_date: null,
  project_status: "Closed",
  project_owner: 0,
};

type GlobalContextType = {
  auth: boolean;
  setAuth: Dispatch<SetStateAction<boolean>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  token: string | null;
  setToken: Dispatch<SetStateAction<string | null>>;
  profile: any;
  setProfile: Dispatch<SetStateAction<any>>;
  currentProject: any;
  setCurrentProject: Dispatch<SetStateAction<any>>;
  projects: any[];
  setProjects: Dispatch<SetStateAction<any[]>>;
  owners: any[];
  setOwners: Dispatch<SetStateAction<any[]>>;
};

export const GlobalContext = createContext<GlobalContextType>({
  auth: defaultAuth,
  setAuth: () => {},
  loading: defaultLoading,
  setLoading: () => {},
  token: defaultToken,
  setToken: () => {},
  profile: defaultProfile,
  setProfile: () => {},
  currentProject: defaultCurrentProject,
  setCurrentProject: () => {},
  projects: defaultProjects,
  setProjects: () => {},
  owners: defaultOwners,
  setOwners: () => {},
});

interface GlobalContextProps {
  children: React.ReactNode;
}

export const GlobalContextProvider = ({ children }: GlobalContextProps) => {
  const [auth, setAuth] = useState<boolean>(defaultAuth);
  const [loading, setLoading] = useState<boolean>(defaultLoading);
  const [token, setToken] = useState<string | null>(defaultToken);
  const [profile, setProfile] = useState<any>(defaultProfile);
  const [currentProject, setCurrentProject] = useState<any>(
    defaultCurrentProject
  );
  const [projects, setProjects] = useState<any[]>(defaultProjects);
  const [owners, setOwners] = useState<any[]>(defaultOwners);

  useLayoutEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("cxspsa");
        if (token && token.trim().length > 0) {
          const result: any = await request.checkToken(token);

          if (result?.authenticated) {
            setAuth(true);
            setToken(token);
            setProfile(result.user);
            setProjects(result.projects.sort(sortProjectsFunc));
            setCurrentProject(result.projects[0] || emptyProject);
            setOwners(result.owners);
            request.setToken(token);
          } else {
            setAuth(false);
            setToken(null);
            setProfile({});
            setCurrentProject(emptyProject);
            setProjects([]);
            request.clearToken();
          }
        }
      } catch (error: any) {
        //
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        auth,
        setAuth,
        loading,
        setLoading,
        token,
        setToken,
        profile,
        setProfile,
        currentProject,
        setCurrentProject,
        projects,
        setProjects,
        owners,
        setOwners,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
