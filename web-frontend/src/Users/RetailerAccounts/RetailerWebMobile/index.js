/**
 * RetailerWebMobile/
 *
 * PURPOSE: Web-responsive mobile view for the GrainRise Retailer.
 * This is what mobile/tablet browsers see when they visit the website.
 * It is completely SEPARATE from the MobileAppView/RetailerMobile/ folder,
 * which is the Figma-based Android Studio mobile app UI.
 *
 * ROUTING:
 *   - Web Desktop View    →  /retailer/dashboard          (with sidebar layout)
 *   - Web Mobile View     →  /retailer/web-mobile         (this folder, no sidebar)
 *   - Mobile App (Figma)  →  /retailer/mobile-preview     (MobileAppView/RetailerMobile/)
 */
export { default as RetailerWebMobileDashboard } from "./RetailerWebMobileDashboard";
