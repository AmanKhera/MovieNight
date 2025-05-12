// src/components/MainLayout.jsx
import React from "react";
import Toolbar from "./Toolbar";

const MainLayout = ({ children }) => {
  return (
    <>
      <Toolbar />
      <div>
        {children}
      </div>
    </>
  );
};

export default MainLayout;