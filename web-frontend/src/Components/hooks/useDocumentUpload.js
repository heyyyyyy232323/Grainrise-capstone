import {
  useCallback,
  useMemo,
  useState,
} from "react";


const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];


const DEFAULT_MAX_SIZE_MB = 5;


const useDocumentUpload = ({
  requirements = [],
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
} = {}) => {

  // =========================================================
  // FILE STATE
  // =========================================================

  const [files, setFiles] =
    useState({});


  // =========================================================
  // ERRORS
  // =========================================================

  const [errors, setErrors] =
    useState({});


  // =========================================================
  // MAX FILE SIZE
  // =========================================================

  const maxSizeBytes =
    maxSizeMB *
    1024 *
    1024;


  // =========================================================
  // REQUIREMENT MAP
  // =========================================================

  const requirementMap =
    useMemo(
      () => {

        const map = {};


        requirements.forEach(
          (requirement) => {

            if (!requirement?.key) {
              return;
            }


            map[
              requirement.key
            ] = requirement;

          }
        );


        return map;

      },
      [requirements]
    );


  // =========================================================
  // VALIDATE ONE FILE
  // =========================================================

  const validateFile =
    useCallback(
      (
        file,
        key
      ) => {

        if (!file) {

          return {
            valid: false,
            error:
              "No file selected.",
          };

        }


        const requirement =
          requirementMap[
            key
          ];


        if (!requirement) {

          return {
            valid: false,
            error:
              "Unknown document field.",
          };

        }


        const documentAllowedTypes =
          requirement.allowedTypes ||
          allowedTypes;


        const documentMaxSizeMB =
          requirement.maxSizeMB ||
          maxSizeMB;


        const documentMaxSizeBytes =
          documentMaxSizeMB *
          1024 *
          1024;


        if (
          !documentAllowedTypes.includes(
            file.type
          )
        ) {

          return {
            valid: false,

            error:
              requirement.invalidTypeMessage ||
              "Invalid file type. Please upload JPG, PNG, WEBP, or PDF.",
          };

        }


        if (
          file.size >
          documentMaxSizeBytes
        ) {

          return {
            valid: false,

            error:
              requirement.maxSizeMessage ||
              `File is too large. Maximum file size is ${documentMaxSizeMB}MB.`,
          };

        }


        return {
          valid: true,
          error: "",
        };

      },
      [
        allowedTypes,
        maxSizeMB,
        requirementMap,
      ]
    );


  // =========================================================
  // ADD FILE
  // =========================================================

  const addFile =
    useCallback(
      (
        key,
        file
      ) => {

        const result =
          validateFile(
            file,
            key
          );


        if (!result.valid) {

          setErrors(
            (previous) => ({
              ...previous,

              [key]:
                result.error,
            })
          );


          return {
            success: false,
            error:
              result.error,
          };

        }


        setFiles(
          (previous) => ({
            ...previous,

            [key]: {
              file,

              name:
                file.name,

              type:
                file.type,

              size:
                file.size,

              sizeMB:
                (
                  file.size /
                  (
                    1024 *
                    1024
                  )
                ).toFixed(2),
            },
          })
        );


        setErrors(
          (previous) => ({
            ...previous,

            [key]:
              "",
          })
        );


        return {
          success: true,
          error: "",
        };

      },
      [validateFile]
    );


  // =========================================================
  // REMOVE FILE
  // =========================================================

  const removeFile =
    useCallback(
      (key) => {

        setFiles(
          (previous) => {

            const updated = {
              ...previous,
            };


            delete updated[
              key
            ];


            return updated;

          }
        );


        setErrors(
          (previous) => ({
            ...previous,

            [key]:
              "",
          })
        );

      },
      []
    );


  // =========================================================
  // GET RAW FILE
  // =========================================================

  const getFile =
    useCallback(
      (key) => {

        return (
          files[
            key
          ]?.file ||
          null
        );

      },
      [files]
    );


  // =========================================================
  // VALIDATE ALL REQUIRED DOCUMENTS
  // =========================================================

  const validateRequired =
    useCallback(
      () => {

        const nextErrors = {};

        let valid = true;


        requirements.forEach(
          (requirement) => {

            if (
              !requirement?.key
            ) {
              return;
            }


            if (
              requirement.required &&
              !files[
                requirement.key
              ]?.file
            ) {

              valid = false;


              nextErrors[
                requirement.key
              ] =
                requirement.requiredMessage ||
                `${requirement.label || "Document"} is required.`;

            }

          }
        );


        setErrors(
          (previous) => ({
            ...previous,
            ...nextErrors,
          })
        );


        return valid;

      },
      [
        files,
        requirements,
      ]
    );


  // =========================================================
  // CHECK IF COMPLETE
  // =========================================================

  const isComplete =
    useMemo(
      () => {

        return requirements
          .filter(
            (requirement) =>
              requirement.required
          )
          .every(
            (requirement) =>
              Boolean(
                files[
                  requirement.key
                ]?.file
              )
          );

      },
      [
        files,
        requirements,
      ]
    );


  // =========================================================
  // APPEND FILES TO FORMDATA
  // =========================================================

  const appendToFormData =
    useCallback(
      (
        formData
      ) => {

        if (
          !formData ||
          typeof formData.append !==
            "function"
        ) {

          throw new Error(
            "A valid FormData instance is required."
          );

        }


        requirements.forEach(
          (requirement) => {

            const selected =
              files[
                requirement.key
              ];


            if (
              !selected?.file
            ) {
              return;
            }


            formData.append(
              requirement.fieldName ||
                requirement.key,

              selected.file,

              selected.name
            );

          }
        );


        return formData;

      },
      [
        files,
        requirements,
      ]
    );


  // =========================================================
  // RESET
  // =========================================================

  const resetDocuments =
    useCallback(
      () => {

        setFiles({});

        setErrors({});

      },
      []
    );


  // =========================================================
  // CLEAR ONE ERROR
  // =========================================================

  const clearError =
    useCallback(
      (key) => {

        setErrors(
          (previous) => ({
            ...previous,

            [key]:
              "",
          })
        );

      },
      []
    );


  // =========================================================
  // PUBLIC API
  // =========================================================

  return {

    requirements,

    files,
    errors,

    isComplete,

    addFile,
    removeFile,
    getFile,

    validateFile,
    validateRequired,

    appendToFormData,

    resetDocuments,
    clearError,

    maxSizeMB,
    maxSizeBytes,
    allowedTypes,
  };

};


export default useDocumentUpload;