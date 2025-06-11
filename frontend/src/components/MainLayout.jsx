import React from "react";
import Toolbar from "./Toolbar";

const MainLayout = ({ children }) => {
  return (
    <>
      <Toolbar />
      <div style={{ paddingTop: "0" }}>
        {children}
      </div>
    </>
  );
};

export default MainLayout;