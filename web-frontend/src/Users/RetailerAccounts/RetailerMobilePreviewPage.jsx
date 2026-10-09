import React from "react";
import RetailerMobileApp from "../MobileAppView/RetailerMobile/RetailerMobileApp";

/**
 * RetailerMobilePreviewPage
 *
 * Renders the Figma-based Android mobile app UI in the browser.
 * Intentionally does NOT pass onExternalNavigate so the app stays
 * fully self-contained and never routes away to web pages.
 *
 * Route: /retailer/mobile-preview
 */
export default function RetailerMobilePreviewPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      <RetailerMobileApp />
    </div>
  );
}
