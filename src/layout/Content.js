import PropTypes from "prop-types";
import { useContext } from "react";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import BottomNav from "../components/BottomNav";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import {
  getEnvDashboardURL,
  getSectionsToShow,
  shouldShowPatientInfo,
  shouldShowNav,
} from "../util/util";
import "../style/App.scss";
import { FhirClientContext } from "../context/FhirClientContext";

export default function Content({ children }) {
  const sections = getSectionsToShow();
  const { client } = useContext(FhirClientContext);
  const showPatientInfo = shouldShowPatientInfo(client);
  return (
    client && (
      <Box sx={{ display: "flex" }}>
        <Header returnURL={getEnvDashboardURL()} inEHR={!showPatientInfo} />
        {shouldShowNav() && <SideNav sections={sections}></SideNav>}
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Toolbar variant="dense" />
          {children}
          {/* add other components as needed */}
        </Box>
        {shouldShowNav() && <BottomNav></BottomNav>}
      </Box>
    )
  );
}

Content.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
