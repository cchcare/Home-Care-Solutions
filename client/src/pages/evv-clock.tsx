import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  Clock,
  MapPin,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Navigation,
  LogIn,
  LogOut,
  Camera,
  RotateCcw,
} from "lucide-react";
import type { CaregiverSchedule, Client, Caregiver } from "@shared/schema";

type ScheduleWithClient = CaregiverSchedule & {
  client?: Client | null;
};

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

function getDistanceString(distance: string | number | null | undefined): string {
  if (distance === null || distance === undefined) return "N/A";
  const numDistance = typeof distance === "string" ? parseFloat(distance) : distance;
  if (isNaN(numDistance)) return "N/A";
  if (numDistance < 1) {
    return `${Math.round(numDistance * 5280)} ft`;
  }
  return `${numDistance.toFixed(2)} mi`;
}

function getStatusBadge(schedule: ScheduleWithClient) {
  if (schedule.clockInTime && schedule.clockOutTime) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-status-completed">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  }
  if (schedule.clockInTime && !schedule.clockOutTime) {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid="badge-status-clocked-in">
        <Clock className="w-3 h-3 mr-1" />
        Clocked In
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" data-testid="badge-status-not-started">
      <XCircle className="w-3 h-3 mr-1" />
      Not Started
    </Badge>
  );
}

// ─── Head Silhouette Overlay ──────────────────────────────────────────────────

function HeadSilhouette() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 640 480"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <mask id="evvOvalMask">
          <rect width="640" height="480" fill="white" />
          <ellipse cx="320" cy="200" rx="120" ry="145" fill="black" />
          <rect x="283" y="335" width="74" height="40" rx="10" fill="black" />
        </mask>
      </defs>
      <rect width="640" height="480" fill="rgba(0,0,0,0.45)" mask="url(#evvOvalMask)" />
      <ellipse cx="320" cy="200" rx="120" ry="145" fill="none" stroke="white" strokeWidth="2.5" opacity="0.9" />
      <rect x="283" y="335" width="74" height="40" rx="10" fill="none" stroke="white" strokeWidth="2.5" opacity="0.9" />
      <text x="320" y="445" textAnchor="middle" fill="white" fontSize="14" fontFamily="sans-serif" opacity="0.85">
        Align your face inside the outline
      </text>
    </svg>
  );
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────

interface CameraModalProps {
  open: boolean;
  action: "clockIn" | "clockOut";
  location: LocationState;
  onClose: () => void;
  onConfirm: (photo: string) => void;
}

function CameraModal({ open, action, location, onClose, onConfirm }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setWebcamError(null);
    setCapturedPhoto(null);
    setCountdown(null);
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
        setWebcamReady(true);
      }
      // Auto-capture countdown
      let count = 3;
      setCountdown(count);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setCountdown(null);
          doCapture();
        }
      }, 1000);
    } catch (e: any) {
      setWebcamError(e.message || "Camera unavailable. Please allow camera access.");
    }
  }, []);

  const doCapture = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 480, 360);
    const photo = canvas.toDataURL("image/jpeg", 0.75);
    setCapturedPhoto(photo);
    stopCamera();
  }, [stopCamera]);

  const handleManualCapture = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
    doCapture();
  }, [doCapture]);

  const retake = useCallback(async () => {
    setCapturedPhoto(null);
    await startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    stopCamera();
    setCapturedPhoto(null);
    setWebcamError(null);
    setCountdown(null);
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      stopCamera();
      setCapturedPhoto(null);
      setWebcamError(null);
      setCountdown(null);
    }
    return () => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      stopCamera();
    };
  }, [open]);

  const locationReady = location.latitude !== null && location.longitude !== null;
  const canConfirm = !!capturedPhoto && locationReady;
  const actionLabel = action === "clockIn" ? "Clock In" : "Clock Out";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {actionLabel} — Photo &amp; Location Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location status */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            location.loading
              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              : locationReady
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          }`}>
            {location.loading ? (
              <><Loader2 className="w-4 h-4 animate-spin shrink-0" /> Getting your location...</>
            ) : locationReady ? (
              <><MapPin className="w-4 h-4 shrink-0" /> Location acquired</>
            ) : (
              <><AlertTriangle className="w-4 h-4 shrink-0" /> {location.error || "Location required"}</>
            )}
          </div>

          {/* Camera / photo area */}
          {webcamError ? (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-6 text-center text-red-700">
              <XCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{webcamError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => startCamera()}>
                Retry Camera
              </Button>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    playsInline
                    muted
                  />
                  {webcamReady && <HeadSilhouette />}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-9xl font-bold drop-shadow-2xl"
                        style={{ textShadow: "0 0 30px rgba(0,0,0,0.8)" }}>
                        {countdown}
                      </span>
                    </div>
                  )}
                  {!webcamReady && !webcamError && (
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/60">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                    </div>
                  )}
                  {webcamReady && countdown === null && (
                    <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm bg-black/30 py-1">
                      Camera ready — position your face in the outline
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  className="w-full h-full object-cover scale-x-[-1]"
                  alt="Captured photo"
                />
              )}
            </div>
          )}

          {/* Requirement checklist */}
          <div className="flex gap-4 text-sm">
            <div className={`flex items-center gap-1.5 ${capturedPhoto ? "text-green-600" : "text-muted-foreground"}`}>
              <Camera className="w-3.5 h-3.5" />
              {capturedPhoto ? "Photo captured" : "Photo required"}
            </div>
            <div className={`flex items-center gap-1.5 ${locationReady ? "text-green-600" : "text-muted-foreground"}`}>
              <MapPin className="w-3.5 h-3.5" />
              {locationReady ? "Location acquired" : "Location required"}
            </div>
          </div>

          {/* Action buttons */}
          {!capturedPhoto ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              {webcamReady && (
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleManualCapture}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {countdown !== null ? "Take Now" : "Take Photo"}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={retake}>
                <RotateCcw className="w-4 h-4 mr-2" /> Retake
              </Button>
              <Button
                className={`flex-1 text-white ${
                  action === "clockIn"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={!canConfirm}
                onClick={() => capturedPhoto && onConfirm(capturedPhoto)}
              >
                {!locationReady ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Waiting for location...</>
                ) : action === "clockIn" ? (
                  <><LogIn className="w-4 h-4 mr-2" /> Confirm Clock In</>
                ) : (
                  <><LogOut className="w-4 h-4 mr-2" /> Confirm Clock Out</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function EvvClock() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"clockIn" | "clockOut" | null>(null);

  const { data: caregiver, isLoading: caregiverLoading } = useQuery<Caregiver | null>({
    queryKey: ["/api/caregivers/by-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/caregivers/by-user/${user.id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch caregiver");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: schedules, isLoading: schedulesLoading } = useQuery<ScheduleWithClient[]>({
    queryKey: ["/api/caregivers", caregiver?.id, "schedules", today],
    queryFn: async () => {
      if (!caregiver?.id) return [];
      const response = await fetch(
        `/api/caregivers/${caregiver.id}/schedules?startDate=${today}&endDate=${today}`
      );
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    },
    enabled: !!caregiver?.id,
  });

  const requestLocation = useCallback(() => {
    setLocation({ latitude: null, longitude: null, error: null, loading: true });

    if (!navigator.geolocation) {
      setLocation({
        latitude: null, longitude: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocation({ latitude: null, longitude: null, error: errorMessage, loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const clockInMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      latitude,
      longitude,
      photo,
    }: {
      scheduleId: string;
      latitude: number;
      longitude: number;
      photo: string;
    }) => {
      const response = await apiRequest("POST", `/api/schedules/${scheduleId}/clock-in`, {
        latitude,
        longitude,
        photo,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Clocked In",
        description: `Successfully clocked in at ${format(new Date(), "h:mm a")}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/caregivers", caregiver?.id, "schedules"],
      });
      setCameraOpen(false);
      setPendingScheduleId(null);
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in. Please try again.",
        variant: "destructive",
      });
      setCameraOpen(false);
      setPendingScheduleId(null);
      setPendingAction(null);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      latitude,
      longitude,
      photo,
    }: {
      scheduleId: string;
      latitude: number;
      longitude: number;
      photo: string;
    }) => {
      const response = await apiRequest("POST", `/api/schedules/${scheduleId}/clock-out`, {
        latitude,
        longitude,
        photo,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Clocked Out",
        description: `Successfully clocked out at ${format(new Date(), "h:mm a")}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/caregivers", caregiver?.id, "schedules"],
      });
      setCameraOpen(false);
      setPendingScheduleId(null);
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out. Please try again.",
        variant: "destructive",
      });
      setCameraOpen(false);
      setPendingScheduleId(null);
      setPendingAction(null);
    },
  });

  const handleClockIn = (scheduleId: string) => {
    setPendingScheduleId(scheduleId);
    setPendingAction("clockIn");
    setLocation({ latitude: null, longitude: null, error: null, loading: true });
    setCameraOpen(true);
    requestLocation();
  };

  const handleClockOut = (scheduleId: string) => {
    setPendingScheduleId(scheduleId);
    setPendingAction("clockOut");
    setLocation({ latitude: null, longitude: null, error: null, loading: true });
    setCameraOpen(true);
    requestLocation();
  };

  const handleCameraConfirm = (photo: string) => {
    if (!pendingScheduleId || !pendingAction) return;
    if (location.latitude === null || location.longitude === null) return;

    if (pendingAction === "clockIn") {
      clockInMutation.mutate({
        scheduleId: pendingScheduleId,
        latitude: location.latitude,
        longitude: location.longitude,
        photo,
      });
    } else {
      clockOutMutation.mutate({
        scheduleId: pendingScheduleId,
        latitude: location.latitude,
        longitude: location.longitude,
        photo,
      });
    }
  };

  const handleCameraClose = () => {
    setCameraOpen(false);
    setPendingScheduleId(null);
    setPendingAction(null);
    setLocation({ latitude: null, longitude: null, error: null, loading: false });
  };

  const isLoading = caregiverLoading || schedulesLoading;
  const isMutating = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-page-title">
                EVV Clock In/Out
              </h1>
              <p className="text-muted-foreground mt-2" data-testid="text-current-date">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            {/* Info banner */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex gap-3 text-blue-700 dark:text-blue-300 text-sm">
                  <Camera className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Photo &amp; location required</strong> — both your camera and GPS location
                    are needed for every clock-in and clock-out.
                  </span>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-4" />
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !caregiver ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2" data-testid="text-no-caregiver">
                    No Caregiver Profile
                  </h3>
                  <p className="text-muted-foreground">
                    Your account is not linked to a caregiver profile. Please contact your administrator.
                  </p>
                </CardContent>
              </Card>
            ) : schedules && schedules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2" data-testid="text-no-schedules">
                    No Visits Today
                  </h3>
                  <p className="text-muted-foreground">
                    You don't have any scheduled visits for today.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {schedules?.map((schedule) => {
                  const canClockIn = !schedule.clockInTime;
                  const canClockOut = schedule.clockInTime && !schedule.clockOutTime;
                  const isCompleted = schedule.clockInTime && schedule.clockOutTime;
                  const isThisPending = pendingScheduleId === schedule.id && isMutating;

                  return (
                    <Card
                      key={schedule.id}
                      className={`transition-all ${
                        isCompleted
                          ? "border-green-500/50"
                          : schedule.clockInTime
                          ? "border-blue-500/50"
                          : ""
                      }`}
                      data-testid={`card-schedule-${schedule.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-client-name-${schedule.id}`}>
                              <User className="w-5 h-5" />
                              {schedule.client
                                ? `${schedule.client.firstName} ${schedule.client.lastName}`
                                : "Unknown Client"}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1" data-testid={`text-schedule-time-${schedule.id}`}>
                                <Clock className="w-4 h-4" />
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                              {schedule.serviceType && (
                                <span data-testid={`text-service-type-${schedule.id}`}>
                                  {schedule.serviceType}
                                </span>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(schedule)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {schedule.client?.address && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            <span className="text-muted-foreground" data-testid={`text-client-address-${schedule.id}`}>
                              {schedule.client.address}
                              {schedule.client.city && `, ${schedule.client.city}`}
                              {schedule.client.state && `, ${schedule.client.state}`}
                            </span>
                          </div>
                        )}

                        {schedule.clockInTime && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Clock In:</span>
                              <span className="font-medium" data-testid={`text-clock-in-time-${schedule.id}`}>
                                {format(new Date(schedule.clockInTime), "h:mm a")}
                              </span>
                            </div>
                            {schedule.clockInDistance && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Distance:</span>
                                <span data-testid={`text-clock-in-distance-${schedule.id}`}>
                                  {getDistanceString(schedule.clockInDistance)}
                                </span>
                              </div>
                            )}
                            {(schedule as any).clockInPhoto && (
                              <div className="flex items-center gap-1.5 text-xs text-green-600">
                                <Camera className="w-3 h-3" /> Photo captured
                              </div>
                            )}
                          </div>
                        )}

                        {schedule.clockOutTime && (
                          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Clock Out:</span>
                              <span className="font-medium" data-testid={`text-clock-out-time-${schedule.id}`}>
                                {format(new Date(schedule.clockOutTime), "h:mm a")}
                              </span>
                            </div>
                            {schedule.clockOutDistance && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Distance:</span>
                                <span data-testid={`text-clock-out-distance-${schedule.id}`}>
                                  {getDistanceString(schedule.clockOutDistance)}
                                </span>
                              </div>
                            )}
                            {(schedule as any).clockOutPhoto && (
                              <div className="flex items-center gap-1.5 text-xs text-green-600">
                                <Camera className="w-3 h-3" /> Photo captured
                              </div>
                            )}
                          </div>
                        )}

                        {!isCompleted && (
                          <div className="pt-2">
                            {canClockIn && (
                              <Button
                                size="lg"
                                className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleClockIn(schedule.id)}
                                disabled={isMutating}
                                data-testid={`button-clock-in-${schedule.id}`}
                              >
                                {isThisPending ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-5 h-5 mr-2" />
                                    Clock In
                                  </>
                                )}
                              </Button>
                            )}

                            {canClockOut && (
                              <Button
                                size="lg"
                                className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
                                onClick={() => handleClockOut(schedule.id)}
                                disabled={isMutating}
                                data-testid={`button-clock-out-${schedule.id}`}
                              >
                                {isThisPending ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-5 h-5 mr-2" />
                                    Clock Out
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}

                        {isCompleted && schedule.evvStatus && (
                          <div className="flex items-center justify-center pt-2">
                            <Badge
                              variant={schedule.evvStatus === "compliant" ? "default" : "destructive"}
                              className={
                                schedule.evvStatus === "compliant"
                                  ? "bg-green-600"
                                  : schedule.evvStatus === "non_compliant"
                                  ? "bg-red-600"
                                  : ""
                              }
                              data-testid={`badge-evv-status-${schedule.id}`}
                            >
                              EVV: {schedule.evvStatus.replace("_", " ")}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Camera + Location Modal */}
      {pendingAction && (
        <CameraModal
          open={cameraOpen}
          action={pendingAction}
          location={location}
          onClose={handleCameraClose}
          onConfirm={handleCameraConfirm}
        />
      )}
    </div>
  );
}

export default EvvClock;
