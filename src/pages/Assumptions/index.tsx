import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { Select, message } from "antd";
import { FormLabel, Button } from "../../components/common";
import { GlobalContext } from "../../lib/context";
import request from "../../lib/request";

const Assumptions = () => {
  const { currentProject, setCurrentProject, projects } =
    useContext(GlobalContext);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentProject["project_id"]) {
      setLoading(false);
      return;
    }

    (async function () {
      try {
        setLoading(true);
        const response: any = await request.post("assumptions/getall", {
          projId: currentProject["project_id"],
        });
        setData(response);
      } catch (error: any) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentProject["project_id"]]);

  const onChangeProject = (value: number) => {
    setCurrentProject(
      projects.find((r) => r["project_id"] == value) || projects[0]
    );
  };

  return (
    <div className="d-flex flex-column pt-6 pb-4 h-full">
      <div className="d-flex justify-between mb-4 nogrow noshrink">
        <FormLabel label="Project">
          <Select
            value={currentProject["project_id"]}
            onChange={onChangeProject}
            style={{ width: 200 }}
          >
            {projects.map((project: any) => (
              <Select.Option
                key={project.project_id}
                value={project.project_id}
              >
                {project.project_name}
              </Select.Option>
            ))}
          </Select>
        </FormLabel>

        {currentProject["project_id"] && (
          <Button href="/assumptions/create">New Assumption</Button>
        )}
      </div>

      <div className="flex-auto overflow-auto">
        {loading ? (
          <div className="d-grid-center h-full">Loading...</div>
        ) : (
          <table className="bg-white table">
            <thead>
              <tr className="bg-table-header">
                <td>ID</td>
                <td>Title</td>
                <td>Created At</td>
                <td>Created By</td>
                <td>Last Updated At</td>
                <td>Last Updated By</td>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center">
                    No Record
                  </td>
                </tr>
              )}
              {data.map((r: any) => (
                <tr key={r["assumption_id"]}>
                  <td className="text-primary underline">
                    <Link to={`/assumptions/${r["assumption_id"]}`}>
                      {r["assumption_id"]}
                    </Link>
                  </td>
                  <td>{r["title"]}</td>
                  <td>{r["created_at"]}</td>
                  <td>{r["created_by"]}</td>
                  <td>{r["updated_at"]}</td>
                  <td>{r["updated_by"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Assumptions;
