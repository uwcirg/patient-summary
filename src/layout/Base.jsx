import React, { useContext, useMemo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import { FhirClientContext } from "../context/FhirClientContext";
import { getEnvDashboardURL, getSectionsToShow, shouldShowPatientInfo, shouldShowNav } from "../util";
import Footer from "./Footer";
import Header from "./Header";
import SideNav from "./SideNav";
import "../style/App.scss";

export default function Content({ children }) {
  const { client } = useContext(FhirClientContext);
  const sections = useMemo(() => getSectionsToShow(), []);
  const showPatientInfo = useMemo(() => shouldShowPatientInfo(client), [client]);
  const showNav = useMemo(() => shouldShowNav(), []);

  if (!client) return null;

  return (
    <>
      <Header returnURL={getEnvDashboardURL()} inEHR={!showPatientInfo} />
      <Box sx={{ display: "flex" }}>
        {showNav && <SideNav sections={sections} />}

        <Box
          component="main"
          sx={[theme => ({
            flexGrow: 1,
            p: theme.spacing(1)
          }), showNav ? {
            width: {
              sm: {
                sm: "240px"
              }
            }
          } : {
            width: {
              sm: {
                sm: "0px"
              }
            }
          }]}
        >
          <Toolbar variant="dense" />
          {children}
        </Box>
      </Box>
      <Footer />
    </>
  );
}

Content.propTypes = {
  children: PropTypes.node,
};
