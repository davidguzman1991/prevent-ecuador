"use client";

import { useEffect, useState } from "react";

import { PublicPreventCalculator } from "@/components/calculator/PreventCalculator";
import MobilePreventCalculator from "@/components/mobile/MobilePreventCalculator";

const MOBILE_BREAKPOINT_PX = 768;
type ViewportMode = "mobile" | "desktop";

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
}

export function HomeResponsiveCalculator() {
  const [viewportMode, setViewportMode] = useState<ViewportMode | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      setViewportMode(isMobileViewport() ? "mobile" : "desktop");
    };
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  if (viewportMode === null) {
    return null;
  }

  return viewportMode === "mobile" ? <MobilePreventCalculator /> : <PublicPreventCalculator />;
}
