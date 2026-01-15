import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RotateCcw, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave?: (signature: string) => void;
  onCancel?: () => void;
  className?: string;
  disabled?: boolean;
}

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  getSignature: () => string | null;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSave, onCancel, className = '', disabled = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const [isEmpty, setIsEmpty] = useState(true);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setIsEmpty(true);
        }
      },
      isEmpty: () => isEmpty,
      getSignature: () => {
        if (isEmpty || !canvasRef.current) return null;
        return canvasRef.current.toDataURL('image/png');
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Set drawing style - use computed foreground color for dark mode support
      const computedStyle = getComputedStyle(document.documentElement);
      const foregroundHsl = computedStyle.getPropertyValue('--foreground').trim();
      ctx.strokeStyle = `hsl(${foregroundHsl})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let lastX = 0;
      let lastY = 0;

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        if (disabled) return;
        isDrawingRef.current = true;
        setIsEmpty(false);
        
        const rect = canvas.getBoundingClientRect();
        if (e instanceof MouseEvent) {
          lastX = e.clientX - rect.left;
          lastY = e.clientY - rect.top;
        } else {
          const touch = e.touches[0];
          lastX = touch.clientX - rect.left;
          lastY = touch.clientY - rect.top;
        }
      };

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawingRef.current || disabled) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        let currentX = 0;
        let currentY = 0;

        if (e instanceof MouseEvent) {
          currentX = e.clientX - rect.left;
          currentY = e.clientY - rect.top;
        } else {
          const touch = e.touches[0];
          currentX = touch.clientX - rect.left;
          currentY = touch.clientY - rect.top;
        }

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        lastX = currentX;
        lastY = currentY;
      };

      const stopDrawing = () => {
        isDrawingRef.current = false;
      };

      // Mouse events
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);

      // Touch events
      canvas.addEventListener('touchstart', startDrawing);
      canvas.addEventListener('touchmove', draw);
      canvas.addEventListener('touchend', stopDrawing);

      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
      };
    }, [disabled]);

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
      }
    };

    const handleSave = () => {
      if (isEmpty || !canvasRef.current) return;
      const signature = canvasRef.current.toDataURL('image/png');
      if (signature && onSave) {
        onSave(signature);
      }
    };

    return (
      <Card className={`p-4 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-8"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          <div className="border-2 border-muted rounded-lg overflow-hidden bg-background">
            <canvas
              ref={canvasRef}
              className={`w-full h-40 touch-none ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-crosshair'}`}
              style={{ touchAction: 'none' }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Sign above using your mouse, touchpad, or touch screen
          </p>

          {(onSave || onCancel) && (
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
              {onSave && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={disabled || isEmpty}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save Signature
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';
