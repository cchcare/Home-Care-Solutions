import { useState } from "react";
import { Link } from "wouter";
import { 
  ArrowLeft,
  Code2,
  Key,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700"
        onClick={copyToClipboard}
      >
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
      </Button>
    </div>
  );
}

function EndpointCard({ 
  method, 
  endpoint, 
  description, 
  requestBody,
  responseBody,
  errorCodes,
  isOpen,
  onToggle
}: { 
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  description: string;
  requestBody?: string;
  responseBody: string;
  errorCodes?: Array<{ status: number; code: string; description: string }>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const methodColors = {
    GET: "bg-green-100 text-green-700 border-green-200",
    POST: "bg-blue-100 text-blue-700 border-blue-200",
    PUT: "bg-amber-100 text-amber-700 border-amber-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="border-slate-200 hover:border-slate-300 transition-colors">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${methodColors[method]} font-mono text-xs px-2 py-1`}>
                  {method}
                </Badge>
                <code className="text-sm font-mono text-slate-700">{endpoint}</code>
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <CardDescription className="text-left mt-2">{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs defaultValue="response" className="mt-4">
              <TabsList className="bg-slate-100">
                {requestBody && <TabsTrigger value="request">Request</TabsTrigger>}
                <TabsTrigger value="response">Response</TabsTrigger>
                {errorCodes && <TabsTrigger value="errors">Errors</TabsTrigger>}
              </TabsList>
              {requestBody && (
                <TabsContent value="request" className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">Request Body:</p>
                  <CodeBlock code={requestBody} />
                </TabsContent>
              )}
              <TabsContent value="response" className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Success Response (200):</p>
                <CodeBlock code={responseBody} />
              </TabsContent>
              {errorCodes && (
                <TabsContent value="errors" className="mt-4">
                  <div className="space-y-2">
                    {errorCodes.map((error, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <Badge variant="outline" className="font-mono text-xs">
                          {error.status}
                        </Badge>
                        <div>
                          <code className="text-sm text-red-600">{error.code}</code>
                          <p className="text-sm text-slate-600">{error.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function ApiDocumentation() {
  const [openEndpoints, setOpenEndpoints] = useState<Record<string, boolean>>({});

  const toggleEndpoint = (id: string) => {
    setOpenEndpoints(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/support">
              <a className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Help Center</span>
              </a>
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-semibold text-slate-900">Mobile API Documentation</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Mobile API Reference</h2>
          <p className="text-lg text-slate-600 mb-6">
            REST API endpoints for mobile application integration with the Home Care Management System.
          </p>
          
          <Card className="bg-indigo-50 border-indigo-200 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Key className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Authentication</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    All endpoints (except login) require JWT bearer authentication. Include the token in the Authorization header:
                  </p>
                  <CodeBlock code="Authorization: Bearer <your-jwt-token>" language="text" />
                  <p className="text-sm text-slate-500 mt-2">Tokens expire after 7 days.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-slate-100 text-slate-700">Base URL</Badge>
            <code className="text-sm bg-slate-100 px-3 py-1 rounded font-mono">
              https://your-domain.com/api/mobile
            </code>
          </div>
        </div>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Key className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900">Authentication Endpoints</h3>
          </div>
          
          <div className="space-y-4">
            <EndpointCard
              method="POST"
              endpoint="/auth/login"
              description="Authenticate a caregiver with email and password. Returns a JWT token for subsequent requests."
              isOpen={openEndpoints["login"]}
              onToggle={() => toggleEndpoint("login")}
              requestBody={`{
  "email": "caregiver@example.com",
  "password": "your-password"
}`}
              responseBody={`{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d",
  "caregiver": {
    "id": "uuid-string",
    "firstName": "John",
    "lastName": "Doe",
    "email": "caregiver@example.com",
    "phone": "+1234567890",
    "officeId": "office-uuid",
    "isActive": true,
    "hhaxCaregiverCode": "HHA123"
  }
}`}
              errorCodes={[
                { status: 400, code: "missing_credentials", description: "Email and password are required" },
                { status: 401, code: "invalid_credentials", description: "Invalid email or password" },
                { status: 401, code: "no_password", description: "Account uses Google sign-in" },
                { status: 403, code: "not_caregiver", description: "Account is not registered as a caregiver" },
                { status: 403, code: "account_inactive", description: "Caregiver account is not active" },
              ]}
            />

            <EndpointCard
              method="POST"
              endpoint="/auth/logout"
              description="Invalidate the current JWT token. Requires authentication."
              isOpen={openEndpoints["logout"]}
              onToggle={() => toggleEndpoint("logout")}
              responseBody={`{
  "success": true,
  "message": "Successfully logged out"
}`}
            />

            <EndpointCard
              method="GET"
              endpoint="/auth/profile"
              description="Retrieve the authenticated caregiver's profile information."
              isOpen={openEndpoints["profile"]}
              onToggle={() => toggleEndpoint("profile")}
              responseBody={`{
  "id": "uuid-string",
  "firstName": "John",
  "lastName": "Doe",
  "email": "caregiver@example.com",
  "phone": "+1234567890",
  "officeId": "office-uuid",
  "isActive": true,
  "hhaxCaregiverCode": "HHA123"
}`}
              errorCodes={[
                { status: 401, code: "unauthorized", description: "Missing or invalid Authorization header" },
                { status: 401, code: "invalid_token", description: "Token is invalid or expired" },
                { status: 404, code: "not_found", description: "Caregiver not found" },
              ]}
            />
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900">Schedule Endpoints</h3>
          </div>
          
          <div className="space-y-4">
            <EndpointCard
              method="GET"
              endpoint="/schedules"
              description="Get the caregiver's upcoming scheduled shifts. Filters out completed and cancelled schedules."
              isOpen={openEndpoints["schedules"]}
              onToggle={() => toggleEndpoint("schedules")}
              responseBody={`{
  "schedules": [
    {
      "id": "schedule-uuid",
      "scheduledDate": "2024-01-20",
      "startTime": "09:00",
      "endTime": "13:00",
      "serviceType": "Personal Care",
      "status": "scheduled",
      "notes": "Client prefers morning visits",
      "clockInTime": null,
      "clockOutTime": null,
      "evvStatus": "pending",
      "client": {
        "id": "client-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "address": "123 Main St, City, ST 12345",
        "phone": "+1987654321",
        "status": "active"
      }
    }
  ],
  "meta": {
    "startDate": "2024-01-15",
    "endDate": "2024-01-31",
    "count": 1
  }
}`}
            />

            <EndpointCard
              method="GET"
              endpoint="/schedules/history"
              description="Get completed shift history with pagination. Includes hours worked calculation."
              isOpen={openEndpoints["history"]}
              onToggle={() => toggleEndpoint("history")}
              responseBody={`{
  "schedules": [
    {
      "id": "schedule-uuid",
      "scheduledDate": "2024-01-18",
      "startTime": "09:00",
      "endTime": "13:00",
      "status": "completed",
      "clockInTime": "2024-01-18T09:05:00.000Z",
      "clockOutTime": "2024-01-18T13:02:00.000Z",
      "evvStatus": "verified",
      "hoursWorked": "3.95",
      "client": { ... }
    }
  ],
  "meta": {
    "startDate": "2023-12-19",
    "endDate": "2024-01-18",
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`}
            />

            <EndpointCard
              method="GET"
              endpoint="/schedules/:id"
              description="Get details for a specific schedule by ID."
              isOpen={openEndpoints["schedule-detail"]}
              onToggle={() => toggleEndpoint("schedule-detail")}
              responseBody={`{
  "id": "schedule-uuid",
  "scheduledDate": "2024-01-20",
  "startTime": "09:00",
  "endTime": "13:00",
  "serviceType": "Personal Care",
  "status": "scheduled",
  "notes": "Client prefers morning visits",
  "clockInTime": null,
  "clockOutTime": null,
  "evvStatus": "pending",
  "client": {
    "id": "client-uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "address": "123 Main St",
    "phone": "+1987654321",
    "status": "active"
  }
}`}
              errorCodes={[
                { status: 403, code: "forbidden", description: "You don't have access to this schedule" },
                { status: 404, code: "not_found", description: "Schedule not found" },
              ]}
            />
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900">Clock In/Out (EVV) Endpoints</h3>
          </div>
          
          <div className="space-y-4">
            <EndpointCard
              method="POST"
              endpoint="/clock/in"
              description="Clock in for a schedule with GPS location for EVV compliance."
              isOpen={openEndpoints["clock-in"]}
              onToggle={() => toggleEndpoint("clock-in")}
              requestBody={`{
  "scheduleId": "schedule-uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "distance": 150
}`}
              responseBody={`{
  "success": true,
  "message": "Successfully clocked in",
  "schedule": {
    "id": "schedule-uuid",
    "clockInTime": "2024-01-20T09:05:00.000Z",
    "clockInLatitude": "40.7128",
    "clockInLongitude": "-74.0060",
    "clockInDistance": "150",
    "evvStatus": "clocked_in"
  }
}`}
              errorCodes={[
                { status: 400, code: "missing_schedule_id", description: "Schedule ID is required" },
                { status: 400, code: "missing_location", description: "Latitude and longitude are required" },
                { status: 400, code: "already_clocked_in", description: "Already clocked in for this schedule" },
                { status: 403, code: "forbidden", description: "You don't have access to this schedule" },
                { status: 404, code: "not_found", description: "Schedule not found" },
              ]}
            />

            <EndpointCard
              method="POST"
              endpoint="/clock/out"
              description="Clock out from a schedule with GPS location. Calculates hours worked."
              isOpen={openEndpoints["clock-out"]}
              onToggle={() => toggleEndpoint("clock-out")}
              requestBody={`{
  "scheduleId": "schedule-uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "distance": 120
}`}
              responseBody={`{
  "success": true,
  "message": "Successfully clocked out",
  "schedule": {
    "id": "schedule-uuid",
    "clockInTime": "2024-01-20T09:05:00.000Z",
    "clockOutTime": "2024-01-20T13:02:00.000Z",
    "clockOutLatitude": "40.7128",
    "clockOutLongitude": "-74.0060",
    "clockOutDistance": "120",
    "evvStatus": "verified",
    "hoursWorked": "3.95"
  }
}`}
              errorCodes={[
                { status: 400, code: "missing_schedule_id", description: "Schedule ID is required" },
                { status: 400, code: "missing_location", description: "Latitude and longitude are required" },
                { status: 400, code: "not_clocked_in", description: "Must clock in before clocking out" },
                { status: 400, code: "already_clocked_out", description: "Already clocked out for this schedule" },
                { status: 403, code: "forbidden", description: "You don't have access to this schedule" },
                { status: 404, code: "not_found", description: "Schedule not found" },
              ]}
            />
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900">Client Endpoints</h3>
          </div>
          
          <div className="space-y-4">
            <EndpointCard
              method="GET"
              endpoint="/clients"
              description="Get all clients assigned to the authenticated caregiver."
              isOpen={openEndpoints["clients"]}
              onToggle={() => toggleEndpoint("clients")}
              responseBody={`{
  "clients": [
    {
      "id": "client-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+1987654321",
      "email": "jane.smith@example.com",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "status": "active"
    }
  ]
}`}
            />
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900">Error Handling</h3>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Error Response Format</CardTitle>
              <CardDescription>All error responses follow this consistent format</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "error": "error_code",
  "message": "Human-readable error description"
}`} />
              
              <h4 className="font-semibold text-slate-900 mt-6 mb-3">Common Error Codes</h4>
              <div className="space-y-2">
                {[
                  { status: 401, code: "unauthorized", description: "Missing Authorization header" },
                  { status: 401, code: "invalid_token", description: "Token is expired or invalid" },
                  { status: 403, code: "account_inactive", description: "Caregiver account is deactivated" },
                  { status: 403, code: "forbidden", description: "Access denied to resource" },
                  { status: 404, code: "not_found", description: "Resource not found" },
                  { status: 500, code: "server_error", description: "Internal server error" },
                ].map((error, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Badge variant="outline" className="font-mono text-xs">{error.status}</Badge>
                    <div>
                      <code className="text-sm text-red-600">{error.code}</code>
                      <p className="text-sm text-slate-600">{error.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mb-12">
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                EVV Status Values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: "pending", description: "Visit not yet started" },
                  { value: "clocked_in", description: "Caregiver has clocked in" },
                  { value: "verified", description: "Visit completed with valid EVV data" },
                  { value: "flagged", description: "Visit has EVV compliance issues" },
                  { value: "manual_override", description: "Status manually adjusted by admin" },
                ].map((status, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100">
                    <code className="text-sm font-mono text-amber-700 bg-amber-100 px-2 py-1 rounded">{status.value}</code>
                    <span className="text-sm text-slate-600">{status.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-sm mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-sm text-slate-500 text-center">
            For API support or to report issues, contact your system administrator.
          </p>
        </div>
      </footer>
    </div>
  );
}
