import { Link } from "react-router-dom";
import styles from "./styles.module.css";

const Navbar = () => {
  return (
    <div className={styles["navbar"]}>
      <div className="d-flex items-center gap-2 py-1 font-12 container">
        <Link to="/navigation" className="nav-item">
          <img src="/icons/icon-home.svg" alt="" width="16" />
          Home
        </Link>
        <Link to="/collaboration" className="nav-item">
          <img src="/icons/icon-team_collaboration.svg" alt="" width="16" />
          Collaboration
        </Link>
        <Link to="/requirements" className="nav-item">
          <img src="/icons/icon-scope.svg" alt="" width="16" />
          Requirements
        </Link>
        <Link to="/assumptions" className="nav-item">
          <img src="/icons/icon-assumptions.svg" alt="" width="16" />
          Assumptions
        </Link>
        <Link to="/project_documents" className="nav-item">
          <img src="/icons/icon-documents.svg" alt="" width="16" />
          Project Documents
        </Link>
        {/* <Link to="/project_summary" className="nav-item">
        <img src="/icons/icon-project_summary.svg" alt="" width="16" />
        Project Summary
      </Link>
      <Link to="/project_contacts" className="nav-item">
        <img src="/icons/icon-project_contacts.svg" alt="" width="16" />
        Project Contacts
      </Link>
      <Link to="/share_project" className="nav-item">
        <img src="/icons/icon-share_project.svg" alt="" width="16" />
        Share Project
      </Link>
      <Link to="/stakeholders" className="nav-item">
        <img src="/icons/icon-stakeholders.svg" alt="" width="16" />
        Stakeholders
      </Link>
      <Link to="/risk_management" className="nav-item">
        <img src="/icons/icon-risks.svg" alt="" width="16" />
        Risks Management
      </Link>
      <Link to="/time_tracking" className="nav-item">
        <img src="/icons/icon-time_tracking.svg" alt="" width="16" />
        Time Tracking
      </Link>
      <Link to="/change_management" className="nav-item">
        <img src="/icons/icon-change.svg" alt="" width="16" />
        Change Management
      </Link>
      <Link to="/issues" className="nav-item">
        <img src="/icons/icon-issue.svg" alt="" width="16" />
        Issues
      </Link>
      <Link to="/ccb" className="nav-item">
        <img src="/icons/icon-ccb.svg" alt="" width="16" />
        Change Control Board
      </Link> */}
      </div>
    </div>
  );
};

export default Navbar;
