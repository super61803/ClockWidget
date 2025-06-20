import { Button } from "../../components/common";
import styles from "./style.module.css";

const NotFound = () => {
  return (
    <div className={styles["container"]}>
      <div className={styles["not-found"]}>
        <p className="mb-2 title">Not Found</p>
        <p className="mb-6 text-secondary">
          We are sorry but the page you are looking for was not found
        </p>
        <Button href="/">Go To Dashboard</Button>
      </div>
    </div>
  );
};

export default NotFound;
