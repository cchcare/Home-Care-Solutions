import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

function EvvClock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });
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
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
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
        setLocation({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const clockInMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      latitude,
      longitude,
    }: {
      scheduleId: string;
      latitude: number;
      longitude: number;
    }) => {
      const response = await apiRequest("POST", `/api/schedules/${scheduleId}/clock-in`, {
        latitude,
        longitude,
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
      setPendingScheduleId(null);
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in. Please try again.",
        variant: "destructive",
      });
      setPendingScheduleId(null);
      setPendingAction(null);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      latitude,
      longitude,
    }: {
      scheduleId: string;
      latitude: number;
      longitude: number;
    }) => {
      const response = await apiRequest("POST", `/api/schedules/${scheduleId}/clock-out`, {
        latitude,
        longitude,
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
      setPendingScheduleId(null);
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out. Please try again.",
        variant: "destructive",
      });
      setPendingScheduleId(null);
      setPendingAction(null);
    },
  });

  useEffect(() => {
    if (
      pendingScheduleId &&
      pendingAction &&
      location.latitude !== null &&
      location.longitude !== null &&
      !location.loading
    ) {
      if (pendingAction === "clockIn") {
        clockInMutation.mutate({
          scheduleId: pendingScheduleId,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      } else if (pendingAction === "clockOut") {
        clockOutMutation.mutate({
          scheduleId: pendingScheduleId,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    }
  }, [location.latitude, location.longitude, location.loading, pendingScheduleId, pendingAction]);

  const handleClockIn = (scheduleId: string) => {
    setPendingScheduleId(scheduleId);
    setPendingAction("clockIn");
    requestLocation();
  };

  const handleClockOut = (scheduleId: string) => {
    setPendingScheduleId(scheduleId);
    setPendingAction("clockOut");
    requestLocation();
  };

  const isLoading = caregiverLoading || schedulesLoading;
  const isPending =
    clockInMutation.isPending || clockOutMutation.isPending || location.loading;

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

            {location.error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive" data-testid="text-location-error">
                        Location Error
                      </p>
                      <p className="text-sm text-muted-foreground">{location.error}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={requestLocation}
                    disabled={location.loading}
                    data-testid="button-retry-location"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Retry Location
                  </Button>
                </CardContent>
              </Card>
            )}

            {location.latitude && location.longitude && (
              <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400" data-testid="text-location-acquired">
                        Location Acquired
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  const isCurrentPending = pendingScheduleId === schedule.id && isPending;
                  const canClockIn = !schedule.clockInTime;
                  const canClockOut = schedule.clockInTime && !schedule.clockOutTime;
                  const isCompleted = schedule.clockInTime && schedule.clockOutTime;

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
                          </div>
                        )}

                        {!isCompleted && (
                          <div className="pt-2">
                            {canClockIn && (
                              <Button
                                size="lg"
                                className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleClockIn(schedule.id)}
                                disabled={isPending}
                                data-testid={`button-clock-in-${schedule.id}`}
                              >
                                {isCurrentPending && pendingAction === "clockIn" ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Getting Location...
                                  </>
                                ) : (
                                  <>
                                    <LogIn className="w-5 h-5 mr-2" />
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
                                disabled={isPending}
                                data-testid={`button-clock-out-${schedule.id}`}
                              >
                                {isCurrentPending && pendingAction === "clockOut" ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Getting Location...
                                  </>
                                ) : (
                                  <>
                                    <LogOut className="w-5 h-5 mr-2" />
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
    </div>
  );
}

export default EvvClock;
