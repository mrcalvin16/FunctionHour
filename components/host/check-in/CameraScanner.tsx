"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BrowserCodeReader,
  BrowserQRCodeReader,
  type IScannerControls,
} from "@zxing/browser";

type CameraDevice = {
  deviceId: string;
  label: string;
};

type CameraScannerProps = {
  active: boolean;
  disabled?: boolean;
  onActiveChange: (active: boolean) => void;
  onScan: (value: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

export default function CameraScanner({
  active,
  disabled = false,
  onActiveChange,
  onScan,
  onError,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const lastValueRef = useRef("");
  const lastScanTimeRef = useRef(0);

  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] =
    useState("");
  const [status, setStatus] = useState<
    "idle" | "requesting" | "ready" | "error"
  >("idle");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject;

    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTorchEnabled(false);
    setTorchAvailable(false);
    setStatus("idle");
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const videoDevices =
        await BrowserCodeReader.listVideoInputDevices();

      const normalizedDevices = videoDevices.map(
        (device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }),
      );

      setDevices(normalizedDevices);

      if (!selectedDeviceId && normalizedDevices.length > 0) {
        const rearCamera =
          normalizedDevices.find((device) =>
            /back|rear|environment/i.test(device.label),
          ) ?? normalizedDevices.at(-1);

        setSelectedDeviceId(
          rearCamera?.deviceId ??
            normalizedDevices[0].deviceId,
        );
      }

      return normalizedDevices;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to find a camera.";

      setStatus("error");
      onError?.(message);

      return [];
    }
  }, [onError, selectedDeviceId]);

  const startScanner = useCallback(async () => {
    if (
      disabled ||
      !active ||
      !videoRef.current ||
      controlsRef.current
    ) {
      return;
    }

    setStatus("requesting");

    try {
      let availableDevices = devices;

      if (availableDevices.length === 0) {
        availableDevices = await loadDevices();
      }

      const deviceId =
        selectedDeviceId ||
        availableDevices.at(-1)?.deviceId ||
        undefined;

      const reader = new BrowserQRCodeReader();

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        async (result) => {
          if (!result || processingRef.current) {
            return;
          }

          const value = result.getText().trim();

          if (!value) {
            return;
          }

          const now = Date.now();
          const repeatedTooSoon =
            value === lastValueRef.current &&
            now - lastScanTimeRef.current < 2500;

          if (repeatedTooSoon) {
            return;
          }

          processingRef.current = true;
          lastValueRef.current = value;
          lastScanTimeRef.current = now;

          try {
            await onScan(value);
          } finally {
            window.setTimeout(() => {
              processingRef.current = false;
            }, 900);
          }
        },
      );

      controlsRef.current = controls;

      const stream = videoRef.current.srcObject;

      if (stream instanceof MediaStream) {
        const track = stream.getVideoTracks()[0];

        const capabilities =
          typeof track?.getCapabilities === "function"
            ? track.getCapabilities()
            : undefined;

        setTorchAvailable(
          Boolean(
            capabilities &&
              "torch" in capabilities &&
              capabilities.torch,
          ),
        );
      }

      setStatus("ready");
      await loadDevices();
    } catch (error) {
      stopScanner();
      setStatus("error");

      let message = "Unable to start the camera.";

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          message =
            "Camera access was denied. Allow camera access in your browser settings and try again.";
        } else if (error.name === "NotFoundError") {
          message =
            "No camera was found on this device.";
        } else if (error.name === "NotReadableError") {
          message =
            "The camera is already being used by another application.";
        } else {
          message = error.message || message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      onError?.(message);
      onActiveChange(false);
    }
  }, [
    active,
    devices,
    disabled,
    loadDevices,
    onActiveChange,
    onError,
    onScan,
    selectedDeviceId,
    stopScanner,
  ]);

  useEffect(() => {
    if (active && !disabled) {
      void startScanner();
    } else {
      stopScanner();
    }

    return stopScanner;
  }, [active, disabled, startScanner, stopScanner]);

  async function changeCamera(deviceId: string) {
    stopScanner();
    setSelectedDeviceId(deviceId);

    window.setTimeout(() => {
      onActiveChange(true);
    }, 100);
  }

  async function toggleTorch() {
    const nextState = !torchEnabled;

    try {
      if (controlsRef.current?.switchTorch) {
        await controlsRef.current.switchTorch(nextState);
        setTorchEnabled(nextState);
        return;
      }

      const stream = videoRef.current?.srcObject;

      if (!(stream instanceof MediaStream)) {
        return;
      }

      const track = stream.getVideoTracks()[0];

      if (!track) {
        return;
      }

      await track.applyConstraints({
        advanced: [
          {
            torch: nextState,
          } as MediaTrackConstraintSet,
        ],
      });

      setTorchEnabled(nextState);
    } catch {
      onError?.(
        "The flashlight is not supported by this camera or browser.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative min-h-[390px] overflow-hidden rounded-[28px] border bg-black transition ${
          active
            ? "border-orange-400/50"
            : "border-white/10"
        }`}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />

        <div className="pointer-events-none absolute inset-8">
          <ScannerCorner position="left-top" />
          <ScannerCorner position="right-top" />
          <ScannerCorner position="left-bottom" />
          <ScannerCorner position="right-bottom" />
        </div>

        {active && status === "ready" ? (
          <div className="camera-scan-line pointer-events-none absolute left-10 right-10 h-px bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.95)]" />
        ) : null}

        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-2 text-xs font-bold text-white backdrop-blur">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "ready"
                ? "bg-emerald-400"
                : status === "error"
                  ? "bg-red-400"
                  : status === "requesting"
                    ? "animate-pulse bg-amber-400"
                    : "bg-zinc-500"
            }`}
          />

          {status === "ready"
            ? "Camera ready"
            : status === "requesting"
              ? "Opening camera"
              : status === "error"
                ? "Camera unavailable"
                : "Camera off"}
        </div>

        {!active ? (
          <div className="relative z-10 flex min-h-[390px] items-center justify-center px-8 text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                ◫
              </div>

              <h3 className="mt-5 text-xl font-black text-white">
                Camera scanner
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-300">
                Scan guest ticket QR codes with this device’s camera.
              </p>

              <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-xs leading-5 text-zinc-300">
                <strong className="font-bold text-white">Camera permission</strong>
                <br />
                After you continue, your browser will ask to use the camera. The live video is used to read ticket QR codes. You can deny access or stop scanning at any time.
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onActiveChange(true)}
                className="mt-6 h-12 rounded-full bg-white px-6 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to camera permission
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {active ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Select camera"
            value={selectedDeviceId}
            onChange={(event) =>
              void changeCamera(event.target.value)
            }
            disabled={devices.length < 2}
            className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 text-sm font-semibold text-white outline-none focus:border-orange-400/60 disabled:opacity-50"
          >
            {devices.length === 0 ? (
              <option value="">Detecting camera...</option>
            ) : (
              devices.map((device) => (
                <option
                  key={device.deviceId}
                  value={device.deviceId}
                >
                  {device.label}
                </option>
              ))
            )}
          </select>

          {torchAvailable ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {torchEnabled
                ? "Turn flashlight off"
                : "Turn flashlight on"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onActiveChange(false)}
            className="h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Stop camera
          </button>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes functionhour-camera-scan-line {
          0% {
            top: 16%;
            opacity: 0.35;
          }

          50% {
            top: 82%;
            opacity: 1;
          }

          100% {
            top: 16%;
            opacity: 0.35;
          }
        }

        .camera-scan-line {
          animation: functionhour-camera-scan-line 2.2s
            ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function ScannerCorner({
  position,
}: {
  position:
    | "left-top"
    | "right-top"
    | "left-bottom"
    | "right-bottom";
}) {
  const positionClasses = {
    "left-top":
      "left-0 top-0 rounded-tl-2xl border-l-4 border-t-4",
    "right-top":
      "right-0 top-0 rounded-tr-2xl border-r-4 border-t-4",
    "left-bottom":
      "bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4",
    "right-bottom":
      "bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4",
  };

  return (
    <span
      className={`absolute h-12 w-12 border-orange-400 ${positionClasses[position]}`}
    />
  );
}
