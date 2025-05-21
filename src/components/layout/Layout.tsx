import React from "react";
import { Box } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout: React.FC = () => {
  return (
    <Box>
      <Navbar />
      <Box mt={4} px={4}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
