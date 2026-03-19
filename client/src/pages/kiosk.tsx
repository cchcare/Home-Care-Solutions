import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/sidebar";
import { format } from "date-fns";
import {
  Camera, LogIn, LogOut, CheckCircle, XCircle, RotateCcw, Eye, EyeOff,
  Delete, AlertTriangle, Video, RefreshCw, ShieldCheck, ShieldAlert,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "login" | "action" | "camera" | "success" | "error";
type FaceMatchStatus = "idle" | "checking" | "match" | "mismatch" | "skipped" | "error";

interface VerifiedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  username: string | null;
  profileImageUrl: string | null;
}

// ─── Head silhouette SVG overlay ─────────────────────────────────────────────

function HeadSilhouette() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 640 480"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Dim the area outside the oval */}
      <defs>
        <mask id="ovalMask">
          <rect width="640" height="480" fill="white" />
          {/* Head oval */}
          <ellipse cx="320" cy="200" rx="120" ry="145" fill="black" />
          {/* Neck */}
          <rect x="283" y="335" width="74" height="40" rx="10" fill="black" />
        </mask>
      </defs>
      <rect width="640" height="480" fill="rgba(0,0,0,0.45)" mask="url(#ovalMask)" />
      {/* White outline around head shape */}
      <ellipse cx="320" cy="200" rx="120" ry="145" fill="none" stroke="white" strokeWidth="2.5" opacity="0.9" />
      <rect x="283" y="335" width="74" height="40" rx="10" fill="none" stroke="white" strokeWidth="2.5" opacity="0.9" />
      {/* Guide text */}
      <text x="320" y="445" textAnchor="middle" fill="white" fontSize="14" fontFamily="sans-serif" opacity="0.85">
        Align your face inside the outline
      </text>
    </svg>
  );
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
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
      // Fallback: no audio
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
      } catch (e: any) {
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
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 300000 });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(500);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch { /* unsupported — skip */ }
  }, []);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") { resolve(null); return; }
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

// ─── Face Detection (browser API) ───────────────────────────────────────────

async function detectFaceInPhoto(photoDataUrl: string): Promise<boolean | null> {
  if (!("FaceDetector" in window)) return null;
  try {
    const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const img = new Image();
    img.src = photoDataUrl;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
    const faces = await detector.detect(img);
    return faces.length > 0;
  } catch { return null; }
}

// ─── PIN Pad ─────────────────────────────────────────────────────────────────

function PinPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
      {digits.map((d, i) =>
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
      )}
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
  const [faceMatchToken, setFaceMatchToken] = useState<string | null>(null);
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
  const [localFaceDetected, setLocalFaceDetected] = useState<boolean | null>(null);
  const [faceMatchStatus, setFaceMatchStatus] = useState<FaceMatchStatus>("idle");
  const [faceMatchConfidence, setFaceMatchConfidence] = useState<number>(0);

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
    setStaffId(""); setPin(""); setVerifiedUser(null); setFaceMatchToken(null); setActiveRecord(null);
    setCapturedPhoto(null); setCapturedVideo(null); setCountdown(null);
    setErrorMsg(""); setSuccessMsg(""); setBreakMinutes("0");
    setLocalFaceDetected(null);
    setFaceMatchStatus("idle"); setFaceMatchConfidence(0);
  }

  async function handleVerify() {
    if (!staffId.trim() || !pin.trim()) { setErrorMsg("Please enter your Staff ID and PIN"); return; }
    setLoading(true); setErrorMsg("");
    try {
      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staffId.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.message || "Verification failed"); setLoading(false); return; }
      setVerifiedUser(data.user);
      setFaceMatchToken(data.faceMatchToken || null);
      setActiveRecord(data.activeRecord);
      setPendingAction(data.activeRecord ? "clock-out" : "clock-in");
      setStep("action");
    } catch { setErrorMsg("Network error. Please try again."); }
    setLoading(false);
  }

  async function runFaceMatch(selfieBase64: string): Promise<boolean | null> {
    if (!verifiedUser?.profileImageUrl || !faceMatchToken) { setFaceMatchStatus("skipped"); return null; }
    setFaceMatchStatus("checking");
    try {
      const res = await fetch("/api/kiosk/face-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfieBase64,
          profileImageUrl: verifiedUser.profileImageUrl,
          faceMatchToken,
        }),
      });
      const data = await res.json();
      if (data.match === null || !res.ok) { setFaceMatchStatus("skipped"); return null; }
      setFaceMatchConfidence(data.confidence || 0);
      setFaceMatchStatus(data.match ? "match" : "mismatch");
      return data.match ? true : false;
    } catch {
      setFaceMatchStatus("skipped");
      return null;
    }
  }

  async function doCapture() {
    const photo = webcam.capture();
    if (!photo) return;
    setCapturedPhoto(photo);

    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);

    // Stop video recording
    const video = await recorder.stopRecording();
    setCapturedVideo(video);

    // Run local face detection + AI face match in parallel
    const [localFace] = await Promise.all([
      detectFaceInPhoto(photo),
      runFaceMatch(photo),
    ]);
    setLocalFaceDetected(localFace);
  }

  async function startCamera() {
    setCapturedPhoto(null); setCapturedVideo(null);
    setLocalFaceDetected(null); setFaceMatchStatus("idle"); setFaceMatchConfidence(0);
    setStep("camera");

    const stream = await webcam.start();
    if (stream) recorder.startRecording(stream);

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
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
    await doCapture();
  }

  async function retakePhoto() {
    setCapturedPhoto(null); setCapturedVideo(null);
    setLocalFaceDetected(null); setFaceMatchStatus("idle"); setFaceMatchConfidence(0);
    await startCamera();
  }

  async function handleSubmit() {
    if (!capturedPhoto) { setErrorMsg("Photo is required."); return; }
    setLoading(true); setErrorMsg("");
    try {
      const endpoint = pendingAction === "clock-in" ? "/api/kiosk/clock-in" : "/api/kiosk/clock-out";
      const body: any = {
        staffId: staffId.trim(), pin: pin.trim(),
        photo: capturedPhoto, video: capturedVideo,
        faceMismatch: faceMatchStatus === "mismatch",
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
      setSuccessMsg(pendingAction === "clock-in" ? `${name} clocked in at ${time}` : `${name} clocked out at ${time}`);
      // Sync face-match status with server's authoritative flagged result
      if (data.flagged && faceMatchStatus !== "mismatch") setFaceMatchStatus("mismatch");
      webcam.stop();
      setStep("success");
    } catch { setErrorMsg("Network error. Please try again."); setStep("error"); }
    setLoading(false);
  }

  const fullName = verifiedUser
    ? `${verifiedUser.firstName || ""} ${verifiedUser.lastName || ""}`.trim()
    : "";
  const isClockedIn = !!activeRecord;
  const isChecking = faceMatchStatus === "checking";

  // Face match banner shown after capture
  const faceMatchBanner = () => {
    if (faceMatchStatus === "checking") return (
      <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-sm mb-3">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        Verifying identity against profile photo...
      </div>
    );
    if (faceMatchStatus === "match") return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-2.5 text-sm mb-3">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        Identity verified — face matches profile photo ({faceMatchConfidence}% confidence)
      </div>
    );
    if (faceMatchStatus === "mismatch") return (
      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-sm mb-3">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        Face does not match profile photo. Clock-in will be flagged for manager review.
      </div>
    );
    if (faceMatchStatus === "skipped") return null; // Silent skip — no banner shown
    if (localFaceDetected === false) return (
      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-sm mb-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        No face detected in the photo. Please retake and ensure your face is clearly visible.
      </div>
    );
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col select-none">

        {/* Header */}
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
                    value={staffId} onChange={e => setStaffId(e.target.value)}
                    placeholder="Username or email" className="mt-1 text-center text-lg"
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
                      id="pin-input" type={showPin ? "text" : "password"}
                      value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="••••" className="mt-1 text-center text-2xl tracking-widest"
                      inputMode="numeric" autoComplete="off"
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
                    <XCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                  </div>
                )}

                <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                  onClick={handleVerify} disabled={loading || !staffId.trim() || !pin.trim()}>
                  {loading ? "Verifying..." : "Continue →"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Action ── */}
          {step === "action" && verifiedUser && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {verifiedUser.profileImageUrl ? (
                  <img src={verifiedUser.profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="text-3xl font-bold text-blue-700">
                    {(verifiedUser.firstName?.[0] || "?").toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{fullName || verifiedUser.username}</h2>
              <p className="text-slate-500 text-sm capitalize mt-1">{verifiedUser.role?.replace(/_/g, " ")}</p>

              <div className="my-5">
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

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4 text-xs text-blue-700 dark:text-blue-300 text-left">
                <strong>Photo &amp; identity verification required.</strong> Your camera will capture a selfie
                {verifiedUser.profileImageUrl ? " and compare it against your profile photo." : "."}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className={`w-full h-14 text-lg font-bold ${isClockedIn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                  onClick={startCamera}>
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
                {recorder.isRecording && !capturedPhoto && (
                  <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <Video className="w-4 h-4" /> Recording
                  </div>
                )}
                {capturedVideo && capturedPhoto && (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                    <Video className="w-4 h-4" /> Video saved
                  </div>
                )}
              </div>

              {webcam.error ? (
                <div className="text-red-600 text-center p-4 bg-red-50 rounded-xl mb-4">
                  <XCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Camera error: {webcam.error}</p>
                  <p className="text-sm text-red-500 mt-1">Please allow camera access and try again.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={reset}>Go Back</Button>
                </div>
              ) : (
                <>
                  {/* Video / Photo preview with head silhouette */}
                  <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "4/3" }}>
                    {!capturedPhoto ? (
                      <>
                        <video
                          ref={webcam.videoRef}
                          className="w-full h-full object-cover scale-x-[-1]"
                          playsInline muted
                        />
                        {/* Head silhouette overlay — shown while camera is live */}
                        {webcam.ready && <HeadSilhouette />}

                        {countdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white text-9xl font-bold drop-shadow-2xl"
                              style={{ textShadow: "0 0 30px rgba(0,0,0,0.8)" }}>
                              {countdown}
                            </span>
                          </div>
                        )}
                        {!webcam.ready && (
                          <div className="absolute inset-0 flex items-center justify-center text-white bg-black/60">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                          </div>
                        )}
                        {webcam.ready && countdown === null && (
                          <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm bg-black/30 py-1">
                            Camera ready — position your face in the outline
                          </div>
                        )}
                        {webcam.ready && countdown !== null && (
                          <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm bg-black/30 py-1">
                            Auto-capturing in {countdown}...
                          </div>
                        )}
                      </>
                    ) : (
                      <img src={capturedPhoto} className="w-full h-full object-cover scale-x-[-1]" alt="Captured selfie" />
                    )}
                  </div>

                  {/* Face match / detection status banner */}
                  {capturedPhoto && faceMatchBanner()}

                  {/* Action buttons */}
                  {!capturedPhoto ? (
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={reset}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      {webcam.ready && (
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleManualCapture}>
                          <Camera className="w-4 h-4 mr-2" />
                          {countdown !== null ? "Take Now" : "Take Photo"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {faceMatchStatus === "mismatch" && (
                        <p className="text-center text-sm text-amber-700">
                          You can still proceed — your manager will review this clock-in.
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={retakePhoto} disabled={loading || isChecking}>
                          <RotateCcw className="w-4 h-4 mr-2" /> Retake
                        </Button>
                        <Button
                          className={`flex-1 text-white ${pendingAction === "clock-in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                          onClick={handleSubmit}
                          disabled={loading || isChecking}>
                          {loading ? "Processing..." : isChecking ? "Verifying..." : pendingAction === "clock-in"
                            ? <><LogIn className="w-4 h-4 mr-2" /> Confirm Clock In</>
                            : <><LogOut className="w-4 h-4 mr-2" /> Confirm Clock Out</>
                          }
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
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${faceMatchStatus === "mismatch" ? "bg-amber-100" : "bg-green-100"}`}>
                {faceMatchStatus === "mismatch"
                  ? <ShieldAlert className="w-12 h-12 text-amber-600" />
                  : <CheckCircle className="w-12 h-12 text-green-600" />
                }
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${faceMatchStatus === "mismatch" ? "text-amber-700" : "text-green-700"}`}>
                {pendingAction === "clock-in" ? "Clocked In!" : "Clocked Out!"}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg">{successMsg}</p>

              {/* Identity verification result */}
              {faceMatchStatus === "match" && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-green-600 text-sm">
                  <ShieldCheck className="w-4 h-4" /> Identity verified ({faceMatchConfidence}% confidence)
                </div>
              )}
              {faceMatchStatus === "mismatch" && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  <ShieldAlert className="w-4 h-4 inline mr-1" />
                  Submitted for manager review.
                </div>
              )}

              {capturedPhoto && (
                <img src={capturedPhoto}
                  className="mt-4 mx-auto w-24 h-24 object-cover rounded-full border-4 border-green-400 scale-x-[-1]"
                  alt="selfie" />
              )}
              {capturedVideo && (
                <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1">
                  <Video className="w-3.5 h-3.5" /> Liveness video recorded
                </p>
              )}

              <p className="text-slate-400 text-sm mt-5">This screen will reset in a few seconds...</p>
              <Button variant="outline" className="mt-3 w-full" onClick={reset}>Done</Button>
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
          <p className="text-blue-300 text-xs">
            Care Crafter Home Care &bull; Staff Kiosk Terminal &bull; Secured by photo &amp; AI identity verification
          </p>
        </div>

      </div>
    </div>
  );
}
