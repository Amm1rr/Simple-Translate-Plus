import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import log from "loglevel";

const logDir = "options/ScrollToTop";

const ScrollToTop = ({ children }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    log.debug(logDir, "Location changed, scrolling to top", { pathname });
    window.scrollTo(0, 0);
  }, [pathname]);

  return children;
};

export default ScrollToTop;
