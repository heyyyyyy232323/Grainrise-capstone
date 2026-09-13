import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Eraser,
  PenLine,
} from "lucide-react";


const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 260;


export default function SignaturePad({
  value = "",
  onChange,
  disabled = false,
  error = "",
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const lastPointRef = useRef(null);

  const [
    hasInk,
    setHasInk,
  ] = useState(false);


  // ==========================================================
  // CANVAS CONTEXT
  // ==========================================================

  const getContext = useCallback(
    () => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return null;
      }

      const context =
        canvas.getContext("2d");

      if (!context) {
        return null;
      }

      context.lineWidth = 4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#0f172a";
      context.fillStyle = "#0f172a";

      return context;
    },
    []
  );


  // ==========================================================
  // LOAD EXISTING DRAWN SIGNATURE
  // ==========================================================

  useEffect(
    () => {
      const canvas =
        canvasRef.current;

      const context =
        getContext();

      if (
        !canvas
        || !context
      ) {
        return;
      }

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (
        !value
        || !String(value).startsWith(
          "data:image/"
        )
      ) {
        setHasInk(false);
        return;
      }

      const image =
        new Image();

      image.onload =
        () => {
          context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          setHasInk(true);
        };

      image.src =
        value;
    },
    [
      value,
      getContext,
    ]
  );


  // ==========================================================
  // POINTER POSITION
  // ==========================================================

  const getPoint =
    (
      event
    ) => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return {
          x: 0,
          y: 0,
        };
      }

      const rect =
        canvas.getBoundingClientRect();

      return {
        x:
          (
            event.clientX
            - rect.left
          )
          * (
            canvas.width
            / rect.width
          ),

        y:
          (
            event.clientY
            - rect.top
          )
          * (
            canvas.height
            / rect.height
          ),
      };
    };


  // ==========================================================
  // EXPORT IMAGE
  // ==========================================================

  const saveSignature =
    () => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      const dataUrl =
        canvas.toDataURL(
          "image/png"
        );

      onChange?.(
        dataUrl
      );

      setHasInk(true);
    };


  // ==========================================================
  // START DRAWING
  // ==========================================================

  const handlePointerDown =
    (
      event
    ) => {
      if (disabled) {
        return;
      }

      event.preventDefault();

      const canvas =
        canvasRef.current;

      const context =
        getContext();

      if (
        !canvas
        || !context
      ) {
        return;
      }

      try {
        canvas.setPointerCapture(
          event.pointerId
        );
      } catch {
        // Pointer capture may not be available in older browsers.
      }

      pointerIdRef.current =
        event.pointerId;

      drawingRef.current =
        true;

      const point =
        getPoint(
          event
        );

      lastPointRef.current =
        point;

      // Draw a small dot so even a tap creates visible ink.
      context.beginPath();

      context.arc(
        point.x,
        point.y,
        2,
        0,
        Math.PI * 2
      );

      context.fill();

      setHasInk(true);
    };


  // ==========================================================
  // DRAW
  // ==========================================================

  const handlePointerMove =
    (
      event
    ) => {
      if (
        disabled
        || !drawingRef.current
        || pointerIdRef.current
          !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();

      const context =
        getContext();

      const previousPoint =
        lastPointRef.current;

      if (
        !context
        || !previousPoint
      ) {
        return;
      }

      const nextPoint =
        getPoint(
          event
        );

      context.beginPath();

      context.moveTo(
        previousPoint.x,
        previousPoint.y
      );

      context.lineTo(
        nextPoint.x,
        nextPoint.y
      );

      context.stroke();

      lastPointRef.current =
        nextPoint;

      setHasInk(true);
    };


  // ==========================================================
  // FINISH DRAWING
  // ==========================================================

  const finishDrawing =
    (
      event
    ) => {
      if (
        !drawingRef.current
      ) {
        return;
      }

      drawingRef.current =
        false;

      pointerIdRef.current =
        null;

      lastPointRef.current =
        null;

      if (
        canvasRef.current
        && event?.pointerId !== undefined
      ) {
        try {
          canvasRef.current.releasePointerCapture(
            event.pointerId
          );
        } catch {
          // Ignore unsupported pointer capture release.
        }
      }

      if (hasInk) {
        saveSignature();
      }
    };


  // ==========================================================
  // CLEAR
  // ==========================================================

  const clearSignature =
    () => {
      if (disabled) {
        return;
      }

      const canvas =
        canvasRef.current;

      const context =
        getContext();

      if (
        canvas
        && context
      ) {
        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      drawingRef.current =
        false;

      pointerIdRef.current =
        null;

      lastPointRef.current =
        null;

      setHasInk(false);

      onChange?.("");
    };


  return (
    <div
      className="
        space-y-2
      "
    >
      <div
        className={`
          overflow-hidden
          rounded-xl
          border
          bg-white
          transition

          ${
            error
              ? "border-red-400 ring-1 ring-red-200"
              : "border-slate-300 focus-within:border-[#0B5D1E]"
          }
        `}
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-slate-200
            bg-slate-50
            px-3
            py-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <PenLine
              size={15}
              className="
                text-[#0B5D1E]
              "
            />

            <span
              className="
                text-xs
                font-semibold
                text-slate-600
              "
            >
              Sign inside the box
            </span>
          </div>


          <button
            type="button"
            onClick={
              clearSignature
            }
            disabled={
              disabled
              || !hasInk
            }
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              px-2.5
              py-1.5
              text-xs
              font-semibold
              text-slate-500
              transition
              hover:bg-white
              hover:text-red-600
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <Eraser
              size={14}
            />

            Clear Signature
          </button>
        </div>


        <div
          className="
            relative
          "
        >
          <canvas
            ref={
              canvasRef
            }
            width={
              CANVAS_WIDTH
            }
            height={
              CANVAS_HEIGHT
            }
            onPointerDown={
              handlePointerDown
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              finishDrawing
            }
            onPointerCancel={
              finishDrawing
            }
            className={`
              block
              h-44
              w-full
              touch-none
              bg-white

              ${
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-crosshair"
              }
            `}
            style={{
              touchAction:
                "none",
            }}
          />


          {!hasInk && (
            <div
              className="
                pointer-events-none
                absolute
                inset-0
                flex
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div>
                <PenLine
                  size={24}
                  className="
                    mx-auto
                    text-slate-300
                  "
                />

                <p
                  className="
                    mt-2
                    text-xs
                    font-medium
                    text-slate-400
                  "
                >
                  Use your mouse, finger, or stylus to sign
                </p>
              </div>
            </div>
          )}
        </div>
      </div>


      {error && (
        <p
          className="
            text-xs
            font-medium
            text-red-600
          "
        >
          {error}
        </p>
      )}


      <p
        className="
          text-[11px]
          leading-4
          text-slate-400
        "
      >
        Your handwritten signature will be attached to this offer as your electronic confirmation.
      </p>
    </div>
  );
}