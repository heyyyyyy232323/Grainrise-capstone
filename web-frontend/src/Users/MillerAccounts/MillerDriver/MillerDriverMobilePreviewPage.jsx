import React from "react";
import MillerDriverApp from "../../MobileAppView/MillerDriver/MillerDriverApp";

/**
 * MillerDriverMobilePreviewPage
 *
 * Renders the Figma-based Android mobile app UI for Miller Driver.
 * Maximizes 100% of the screen width and height on any device/viewport.
 * Route: /miller-driver/mobile-preview
 */
export default function MillerDriverMobilePreviewPage() {
  return (
    <div className="w-full min-h-screen bg-[#f8fafc]">
      <MillerDriverApp />
    </div>
  );
}
