// src/components/MainLayout.jsx
import React from "react";
import Toolbar from "./Toolbar";

const MainLayout = ({ children }) => {
  return (
    <>
      <Toolbar />
      <div style={{ paddingTop: "105px" }}>
        {children}
      </div>
    </>
  );
};

export default MainLayout;