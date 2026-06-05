"use client";

import { useEffect, useState } from "react";

import { PreventCalculator } from "@/components/calculator/PreventCalculator";
import MobilePreventCalculator from "@/components/mobile/MobilePreventCalculator";

const MOBILE_BREAKPOINT_PX = 768;

function isMobileViewport() {
  return window.innerWidth < MOBILE_BREAKPOINT_PX;
}

export function HomeResponsiveCalculator() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(isMobileViewport());
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return isMobile ? <MobilePreventCalculator /> : <PreventCalculator />;
}

