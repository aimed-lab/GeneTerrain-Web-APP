import React from "react";
import { Box } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import FloatingChat from "../common/FloatingChat";

const Layout: React.FC = () => {
  return (
    <Box>
      <Navbar />
      <Box mt={4} px={4}>
        <Outlet />
      </Box>
      <FloatingChat />
    </Box>
  );
};

export default Layout;
