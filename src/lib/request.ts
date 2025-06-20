import axios from "axios";
import type { AxiosRequestConfig } from "axios";

axios.defaults.baseURL = `${process.env.REACT_APP_BACKEND_URL || ""}/api/`;

const option: AxiosRequestConfig = {
  //   validateStatus: () => true,
};

const setToken = (token: string) => {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  localStorage.setItem("cxspsa", token);
};

const clearToken = () => {
  delete axios.defaults.headers.common["Authorization"];
  localStorage.removeItem("cxspsa");
};

const post = (endpoint: string, payload: any = {}) => {
  return new Promise((resolve, reject) => {
    axios
      .post(endpoint, payload, option)
      .then(({ data }) => resolve(data))
      .catch((error) => {
        if (
          error?.response?.data?.message === "Unauthorized" ||
          error?.message === "Unauthorized"
        ) {
          location.href =
            process.env.NODE_ENV === "production"
              ? "/cxspsa/auth/signin"
              : "/psa/auth/signin";
          return;
        }

        if (error.response && error.response.data) {
          reject({
            ...error.response.data,
            name: error.response.data.name || "Error",
            message: error.response.data.message || "Something went wrong!",
          });
        } else {
          reject({
            name: error.name || "Error",
            message: error.message || "Something went wrong!",
          });
        }
      });
  });
};

const checkToken = (token: string) => {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject(false);
    }

    axios
      .post(
        process.env.NODE_ENV === "production"
          ? "https://pm.coexsys.com/cxspsa_bk/api/auth/check"
          : "auth/check",
        // ? "https://ylot.com/cxspsa_bk/api/auth/check"
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(({ data }) => resolve(data))
      .catch((error) => {
        if (
          error?.response?.data?.message === "Unauthorized" ||
          error?.message === "Unauthorized"
        ) {
          location.href =
            process.env.NODE_ENV === "production"
              ? "/cxspsa/auth/signin"
              : "/psa/auth/signin";
          return;
        }

        if (error.response && error.response.data) {
          reject({
            ...error.response.data,
            name: error.response.data.name || "Error",
            message: error.response.data.message || "Something went wrong!",
          });
        } else {
          reject({
            name: error.name || "Error",
            message: error.message || "Something went wrong!",
          });
        }
      });
  });
};

const request = {
  setToken,
  clearToken,
  checkToken,
  post,
};

export default request;
