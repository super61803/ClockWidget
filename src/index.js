import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App";
import { GlobalContextProvider } from "./lib/context";
import { registerLicense } from "@syncfusion/ej2-base";
import "./app.css";

// Register Syncfusion License Key
registerLicense(process.env.REACT_APP_SYNCFUION_LICENSE_KEY || "");

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <GlobalContextProvider>
    <ConfigProvider>
      <BrowserRouter basename={process.env.REACT_APP_BASE_URL || ""}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </GlobalContextProvider>
);
