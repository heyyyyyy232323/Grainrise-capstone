import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Camera, RotateCcw, Check, X, AlertCircle } from "lucide-react";

export default function DriverProofOfDeliveryModal({
  isOpen,
  onClose,
  onSaveProof,
  isLoading = false,
  title = "Proof of Delivery",
  subtitle = "Capture delivery proof using device camera",
  saveLabel = "Save & Confirm",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCapturedPhoto(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err.message || "Failed to access device camera. Please check camera permissions.");
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      startCamera();
      return () => {
        document.body.style.overflow = prev;
        stopCamera();
      };
    } else {
      stopCamera();
      setCapturedPhoto(null);
      setCameraError("");
    }
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleSave = () => {
    if (!capturedPhoto) return;
    onSaveProof(capturedPhoto);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Top Right X Only */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera / Preview Viewport */}
        <div className="p-5 flex flex-col items-center">
          <div className="w-full aspect-4/3 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-200 shadow-inner">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Delivery Proof"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
            )}

            {!capturedPhoto && !cameraActive && !cameraError && (
              <div className="text-white text-xs flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting camera...
              </div>
            )}

            {cameraError && (
              <div className="p-4 text-center max-w-xs space-y-2">
                <AlertCircle size={28} className="text-rose-500 mx-auto" />
                <p className="text-xs text-rose-200">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-semibold hover:bg-white/30 transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="mt-5 w-full">
            {!capturedPhoto ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!cameraActive}
                  className="w-16 h-16 rounded-full bg-[#0B5D1E] hover:bg-emerald-800 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-40 cursor-pointer border-4 border-emerald-100"
                >
                  <Camera size={26} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0B5D1E] hover:bg-emerald-800 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {saveLabel}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
