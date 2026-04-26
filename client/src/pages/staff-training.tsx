import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowLeft } from "lucide-react";

export default function StaffTraining() {
  const [iframeKey, setIframeKey] = useState(0);
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/training")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Training
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIframeKey(k => k + 1)}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Restart Course
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          key={iframeKey}
          src="/tools/staff-training.html"
          className="w-full h-full border-0"
          title="Administrative Staff Training Program"
          data-testid="iframe-staff-training"
        />
      </div>
    </div>
  );
}
