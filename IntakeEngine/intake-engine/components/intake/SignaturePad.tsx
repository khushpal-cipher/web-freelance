"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (hasSignature: boolean) => void }>(
  ({ onChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasDrawn = useRef(false);
    const [empty, setEmpty] = useState(true);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#141413";
      }
    }, []);

    function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function start(e: React.PointerEvent<HTMLCanvasElement>) {
      drawing.current = true;
      const ctx = canvasRef.current?.getContext("2d");
      const { x, y } = getPos(e);
      ctx?.beginPath();
      ctx?.moveTo(x, y);
    }

    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      const { x, y } = getPos(e);
      ctx?.lineTo(x, y);
      ctx?.stroke();
      if (!hasDrawn.current) {
        hasDrawn.current = true;
        setEmpty(false);
        onChange?.(true);
      }
    }

    function end() {
      drawing.current = false;
    }

    function clearCanvas() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn.current = false;
      setEmpty(true);
      onChange?.(false);
    }

    useImperativeHandle(ref, () => ({
      getDataUrl: () => (hasDrawn.current ? canvasRef.current?.toDataURL("image/png") ?? null : null),
      clear: clearCanvas,
    }));

    return (
      <div>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Signature drawing area"
          className="h-40 w-full touch-none rounded-md border border-ink/20 bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-ink/50">{empty ? "Sign above using your mouse or finger" : "Looks good"}</p>
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={clearCanvas}>
            Clear
          </Button>
        </div>
      </div>
    );
  }
);
SignaturePad.displayName = "SignaturePad";
