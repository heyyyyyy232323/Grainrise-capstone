import { useState } from "react";

/**
 * useFileUpload
 * Handles drag-and-drop and click-to-upload file logic,
 * including type validation, size checks, and FileReader base64 conversion.
 *
 * @param {object} options
 * @param {string[]} options.allowedTypes - MIME types (default: jpg, png, webp, pdf)
 * @param {number}   options.maxSizeMB    - Maximum file size in MB (default: 5)
 *
 * Usage:
 *   const { files, handleFileDrop, handleFileChange, removeFile, uploadError } = useFileUpload();
 *   // Access a file: files["doc1"]
 */
const useFileUpload = (
  options = {}
) => {
  const {
    allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ],
    maxSizeMB = 5,
  } = options;

  const [files, setFiles] = useState({});
  const [uploadError, setUploadError] = useState("");

  /**
   * Core validation and processing — shared by drag-drop and click-upload.
   * Reads the file as base64 and stores it under the given key.
   */
  const validateAndProcessFile = (file, fileKey) => {
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed."
      );
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setUploadError("");

    const reader = new FileReader();
    reader.onload = () => {
      setFiles((prev) => ({
        ...prev,
        [fileKey]: {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          type: file.type,
          base64: reader.result, // ready for backend submission
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  /** Handler for drag-and-drop events */
  const handleFileDrop = (e, fileKey) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    validateAndProcessFile(droppedFile, fileKey);
  };

  /** Handler for <input type="file"> onChange events */
  const handleFileChange = (e, fileKey) => {
    const selectedFile = e.target.files[0];
    validateAndProcessFile(selectedFile, fileKey);
  };

  /** Remove a specific file by its key */
  const removeFile = (fileKey) => {
    setFiles((prev) => {
      const updated = { ...prev };
      delete updated[fileKey];
      return updated;
    });
    setUploadError("");
  };

  /** Remove all uploaded files */
  const clearFiles = () => {
    setFiles({});
    setUploadError("");
  };

  /** Check if a specific file slot has been filled */
  const hasFile = (fileKey) => Boolean(files[fileKey]);

  return {
    files,
    uploadError,
    handleFileDrop,
    handleFileChange,
    removeFile,
    clearFiles,
    hasFile,
  };
};

export default useFileUpload;
