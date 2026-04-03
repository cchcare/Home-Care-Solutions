import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowLeft } from "lucide-react";

export default function VisitHoursDifference() {
  const [iframeKey, setIframeKey] = useState(0);
  const [, navigate] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Visit Hours Difference"
          subtitle="Detect schedule vs visit hour discrepancies greater than 15 minutes"
        />
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Portal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIframeKey(k => k + 1)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            key={iframeKey}
            src="/tools/visit-hours-difference.html"
            className="w-full h-full border-0"
            title="Visit Hours Difference"
            data-testid="iframe-visit-hours-difference"
          />
        </div>
      </main>
    </div>
  );
}
