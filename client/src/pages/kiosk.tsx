import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/sidebar";
import { format } from "date-fns";
import {
  Camera, LogIn, LogOut, CheckCircle, XCircle, RotateCcw, Eye, EyeOff,
  Delete, AlertTriangle, Video, VideoOff, UserCheck, RefreshCw
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "login" | "action" | "camera" | "success" | "error";

interface VerifiedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  username: string | null;
}

// ─── Webcam + Audio Hook ────────────────────────────────────────────────────

function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      // Request both video and audio for liveness verification
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute local playback to avoid feedback
        await videoRef.current.play();
        setReady(true);
      }
      return stream;
    } catch (e: any) {
      // Try fallback without audio if permission denied for audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play();
          setReady(true);
        }
        return stream;
      } catch {
        setError(e.message || "Camera unavailable");
        return null;
      }
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const capture = useCallback((): string | null => {
    if (!videoRef.current || !ready) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, 480, 360);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, [ready]);

  return { videoRef, ready, error, start, stop, capture, streamRef };
}

// ─── Video Recorder Hook ────────────────────────────────────────────────────

function useVideoRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 300000, // Low bitrate ~300kbps to keep file small
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(500); // Collect in 0.5s chunks
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // MediaRecorder not supported — fail silently
    }
  }, []);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
        setIsRecording(false);
      };
      recorder.stop();
      recorderRef.current = null;
    });
  }, []);

  return { startRecording, stopRecording, isRecording };
}

// ─── Face Detection ─────────────────────────────────────────────────────────

async function detectFace(photoDataUrl: string): Promise<boolean | null> {
  // FaceDetector API is available in Chrome 91+ with Experimental Web Platform Features
  if (!("FaceDetector" in window)) return null; // Not supported — skip check
  try {
    const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const img = new Image();
    img.src = photoDataUrl;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
    const faces = await detector.detect(img);
    return faces.length > 0;
  } catch {
    return null; // Detection error — don't block
  }
}

// ─── PIN Pad ─────────────────────────────────────────────────────────────────

function PinPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
      {digits.map((d, i) => (
        d === "" ? <div key={i} /> :
        d === "⌫" ? (
          <button key={i} onClick={() => onChange(value.slice(0, -1))}
            className="flex items-center justify-center h-12 rounded-xl bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold text-lg hover:bg-red-200 transition-colors">
            <Delete className="w-5 h-5" />
          </button>
        ) : (
          <button key={i} onClick={() => value.length < 8 && onChange(value + d)}
            className="h-12 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm">
            {d}
          </button>
        )
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Kiosk() {
  const webcam = useWebcam();
  const recorder = useVideoRecorder();
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<Step>("login");
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingAction, setPendingAction] = useState<"clock-in" | "clock-out">("clock-in");
  const [now, setNow] = useState(new Date());
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [inputMode, setInputMode] = useState<"keyboard" | "pad">("pad");
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [detectingFace, setDetectingFace] = useState(false);
  const [autoCaptureDone, setAutoCaptureDone] = useState(false);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-reset after success/error
  useEffect(() => {
    if (step === "success" || step === "error") {
      const t = setTimeout(() => reset(), 9000);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => () => {
    webcam.stop();
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  function reset() {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    webcam.stop();
    setStep("login");
    setStaffId("");
    setPin("");
    setVerifiedUser(null);
    setActiveRecord(null);
    setCapturedPhoto(null);
    setCapturedVideo(null);
    setCountdown(null);
    setErrorMsg("");
    setSuccessMsg("");
    setBreakMinutes("0");
    setFaceDetected(null);
    setDetectingFace(false);
    setAutoCaptureDone(false);
  }

  async function handleVerify() {
    if (!staffId.trim() || !pin.trim()) {
      setErrorMsg("Please enter your Staff ID and PIN");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staffId.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.message || "Verification failed"); setLoading(false); return; }
      setVerifiedUser(data.user);
      setActiveRecord(data.activeRecord);
      setPendingAction(data.activeRecord ? "clock-out" : "clock-in");
      setStep("action");
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function doCapture() {
    const photo = webcam.capture();
    if (!photo) return;
    setCapturedPhoto(photo);
    setAutoCaptureDone(true);

    // Stop countdown
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);

    // Stop recording and save video
    const video = await recorder.stopRecording();
    setCapturedVideo(video);

    // Face detection
    setDetectingFace(true);
    const hasFace = await detectFace(photo);
    setFaceDetected(hasFace);
    setDetectingFace(false);
  }

  async function startCamera() {
    setCapturedPhoto(null);
    setCapturedVideo(null);
    setFaceDetected(null);
    setAutoCaptureDone(false);
    setStep("camera");

    const stream = await webcam.start();

    // Start video recording as soon as camera opens
    if (stream) {
      recorder.startRecording(stream);
    }

    // 3-second countdown then auto-capture
    let count = 3;
    setCountdown(count);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(async () => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountdown(null);
        await doCapture();
      }
    }, 1000);
  }

  async function handleManualCapture() {
    // User clicks "Take Photo Now" — stop countdown first
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
    await doCapture();
  }

  async function retakePhoto() {
    setCapturedPhoto(null);
    setCapturedVideo(null);
    setFaceDetected(null);
    setAutoCaptureDone(false);
    await startCamera();
  }

  async function handleSubmit() {
    if (!capturedPhoto) {
      setErrorMsg("Photo is required. Please take a photo before proceeding.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const endpoint = pendingAction === "clock-in" ? "/api/kiosk/clock-in" : "/api/kiosk/clock-out";
      const body: any = {
        staffId: staffId.trim(),
        pin: pin.trim(),
        photo: capturedPhoto,
        video: capturedVideo,
      };
      if (pendingAction === "clock-out") body.breakMinutes = parseInt(breakMinutes) || 0;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.message || "Action failed"); setStep("error"); setLoading(false); return; }

      const name = `${data.user?.firstName || ""} ${data.user?.lastName || ""}`.trim();
      const time = format(new Date(), "h:mm a");
      setSuccessMsg(pendingAction === "clock-in"
        ? `${name} clocked in at ${time}`
        : `${name} clocked out at ${time}`
      );
      webcam.stop();
      setStep("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
    setLoading(false);
  }

  const fullName = verifiedUser ? `${verifiedUser.firstName || ""} ${verifiedUser.lastName || ""}`.trim() : "";
  const isClockedIn = !!activeRecord;

  // Face detection status banner
  const faceStatusBanner = () => {
    if (detectingFace) return (
      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm mb-3">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        Checking for face...
      </div>
    );
    if (faceDetected === false) return (
      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-300 rounded-lg p-2 text-sm mb-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        No face detected. Please retake or ensure your face is clearly visible.
      </div>
    );
    if (faceDetected === true) return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 text-sm mb-3">
        <UserCheck className="w-4 h-4 shrink-0" />
        Face verified ✓
      </div>
    );
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col select-none">

      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/20">
        <div>
          <h1 className="text-white font-bold text-xl tracking-wide">Care Crafter Home Care</h1>
          <p className="text-blue-200 text-sm">Staff Clock-In / Clock-Out Kiosk</p>
        </div>
        <div className="text-right">
          <p className="text-white text-3xl font-mono font-bold">{format(now, "h:mm:ss a")}</p>
          <p className="text-blue-200 text-sm">{format(now, "EEEE, MMMM d, yyyy")}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">

        {/* ── Step: Login ── */}
        {step === "login" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome</h2>
              <p className="text-slate-500 text-sm mt-1">Enter your Staff ID and PIN to continue</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-200 font-semibold">Staff ID</Label>
                <Input
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  placeholder="Username or email"
                  className="mt-1 text-center text-lg"
                  autoComplete="off"
                  onKeyDown={e => e.key === "Enter" && document.getElementById("pin-input")?.focus()}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-slate-700 dark:text-slate-200 font-semibold">Kiosk PIN</Label>
                  <div className="flex gap-2 text-xs text-slate-400">
                    <button onClick={() => setInputMode(inputMode === "pad" ? "keyboard" : "pad")} className="underline">
                      {inputMode === "pad" ? "Type instead" : "Use keypad"}
                    </button>
                    <button onClick={() => setShowPin(!showPin)}>
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {inputMode === "keyboard" ? (
                  <Input
                    id="pin-input"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="••••"
                    className="mt-1 text-center text-2xl tracking-widest"
                    inputMode="numeric"
                    autoComplete="off"
                    onKeyDown={e => e.key === "Enter" && handleVerify()}
                  />
                ) : (
                  <div className="mt-2">
                    <div className="text-center text-2xl tracking-widest mb-3 h-8">
                      {showPin ? pin : pin.replace(/./g, "●") || <span className="text-slate-300">PIN</span>}
                    </div>
                    <PinPad value={pin} onChange={setPin} />
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <Button
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                onClick={handleVerify}
                disabled={loading || !staffId.trim() || !pin.trim()}
              >
                {loading ? "Verifying..." : "Continue →"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Action ── */}
        {step === "action" && verifiedUser && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-blue-700">
                {(verifiedUser.firstName?.[0] || "?").toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{fullName || verifiedUser.username}</h2>
            <p className="text-slate-500 text-sm capitalize mt-1">{verifiedUser.role?.replace(/_/g, " ")}</p>

            <div className="my-6">
              {isClockedIn ? (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
                  <p className="text-green-700 dark:text-green-300 font-semibold">Currently Clocked In</p>
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    Since {format(new Date(activeRecord.clockInTime), "h:mm a")}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
                  <p className="text-slate-600 dark:text-slate-300 font-semibold">Not Clocked In</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ready to start your shift</p>
                </div>
              )}
            </div>

            {isClockedIn && (
              <div className="mb-4">
                <Label className="text-sm text-slate-600 dark:text-slate-300">Break time taken</Label>
                <div className="flex gap-2 justify-center mt-2 flex-wrap">
                  {[["0", "No break"], ["15", "15 min"], ["30", "30 min"], ["60", "1 hour"]].map(([v, label]) => (
                    <button key={v} onClick={() => setBreakMinutes(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${breakMinutes === v ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notice about photo + video requirement */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4 text-xs text-blue-700 dark:text-blue-300 text-left">
              <strong>Photo & video verification required.</strong> Your camera and microphone will be used to take a selfie and record a short liveness clip for security.
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className={`w-full h-14 text-lg font-bold ${isClockedIn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                onClick={startCamera}
              >
                <Camera className="w-5 h-5 mr-2" />
                {isClockedIn ? "Clock Out with Photo" : "Clock In with Photo"}
              </Button>
              <Button variant="outline" className="w-full" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Camera ── */}
        {step === "camera" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {capturedPhoto ? "Review Your Photo" : "Take Your Selfie"}
              </h2>
              {/* Recording indicator */}
              {recorder.isRecording && !capturedPhoto && (
                <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <Video className="w-4 h-4" />
                  Recording
                </div>
              )}
              {capturedVideo && capturedPhoto && (
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <Video className="w-4 h-4" />
                  Video saved
                </div>
              )}
            </div>

            {webcam.error && (
              <div className="text-red-600 text-center p-4 bg-red-50 rounded-xl mb-4">
                <XCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Camera error: {webcam.error}</p>
                <p className="text-sm text-red-500 mt-1">Photo is required to clock in/out. Please allow camera access and try again.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
                  Go Back
                </Button>
              </div>
            )}

            {!webcam.error && (
              <>
                {/* Video / Photo preview */}
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                  {!capturedPhoto ? (
                    <>
                      <video ref={webcam.videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-white text-8xl font-bold drop-shadow-lg animate-pulse">{countdown}</span>
                        </div>
                      )}
                      {!webcam.ready && (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                        </div>
                      )}
                      <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm">
                        {countdown !== null
                          ? `Auto-capturing in ${countdown}...`
                          : webcam.ready
                            ? "Camera ready — position your face in frame"
                            : "Starting camera..."}
                      </div>
                    </>
                  ) : (
                    <img src={capturedPhoto} className="w-full h-full object-cover scale-x-[-1]" alt="Captured selfie" />
                  )}
                </div>

                {/* Face detection banner (shown after capture) */}
                {capturedPhoto && faceStatusBanner()}

                {/* Action buttons */}
                {!capturedPhoto ? (
                  /* Live camera controls */
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={reset}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    {webcam.ready && (
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleManualCapture}
                        disabled={!webcam.ready}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {countdown !== null ? `Take Now (skip countdown)` : "Take Photo"}
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Post-capture controls */
                  <div className="flex flex-col gap-3">
                    {faceDetected === false && (
                      <p className="text-center text-sm text-amber-700">
                        We couldn't detect a face clearly. Retake for better accuracy, or proceed if the photo shows your face.
                      </p>
                    )}
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={retakePhoto} disabled={loading}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Retake
                      </Button>
                      <Button
                        className={`flex-1 text-white ${pendingAction === "clock-in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                        onClick={handleSubmit}
                        disabled={loading || detectingFace}
                      >
                        {loading ? "Processing..." : detectingFace ? "Verifying..." : pendingAction === "clock-in" ? (
                          <><LogIn className="w-4 h-4 mr-2" /> Confirm Clock In</>
                        ) : (
                          <><LogOut className="w-4 h-4 mr-2" /> Confirm Clock Out</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              {pendingAction === "clock-in" ? "Clocked In!" : "Clocked Out!"}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg">{successMsg}</p>

            {capturedPhoto && (
              <img src={capturedPhoto} className="mt-4 mx-auto w-24 h-24 object-cover rounded-full border-4 border-green-400 scale-x-[-1]" alt="selfie" />
            )}
            {capturedVideo && (
              <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
                <Video className="w-3.5 h-3.5" /> Liveness video recorded
              </p>
            )}

            <p className="text-slate-400 text-sm mt-6">This screen will reset in a few seconds...</p>
            <Button variant="outline" className="mt-3 w-full" onClick={reset}>
              Done
            </Button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === "error" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">Something went wrong</h2>
            <p className="text-slate-600 dark:text-slate-300">{errorMsg}</p>
            <p className="text-slate-400 text-sm mt-4">This screen will reset automatically...</p>
            <Button className="mt-4 w-full" onClick={reset}>Try Again</Button>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-blue-300 text-xs">Care Crafter Home Care &bull; Staff Kiosk Terminal &bull; Secured by photo &amp; video verification</p>
      </div>

      </div>
    </div>
  );
}
