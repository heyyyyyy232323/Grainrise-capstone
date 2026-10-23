import React from "react";
import WarehouseDriverApp from "../../MobileAppView/WarehouseDriver/WarehouseDriverApp";

/**
 * WarehouseDriverMobilePreviewPage
 *
 * Renders the Figma-based Android mobile app UI for Warehouse Driver.
 * Maximizes 100% of the screen width and height on any device/viewport.
 * Route: /warehouse-driver/mobile-preview
 */
export default function WarehouseDriverMobilePreviewPage() {
  return (
    <div className="w-full min-h-screen bg-[#f8fafc]">
      <WarehouseDriverApp />
    </div>
  );
}
