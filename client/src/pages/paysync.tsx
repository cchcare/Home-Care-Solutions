import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowLeft } from "lucide-react";

export default function PaySync() {
  const [iframeKey, setIframeKey] = useState(0);
  const [, navigate] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="PaySync"
          subtitle="ADP Payroll Import Generator — transform HHA caregiver hours into ADP-ready CSV files"
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
            src="/tools/paysync.html"
            className="w-full h-full border-0"
            title="PaySync ADP Payroll Import Generator"
            data-testid="iframe-paysync"
          />
        </div>
      </main>
    </div>
  );
}
