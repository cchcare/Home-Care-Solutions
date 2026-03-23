import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

export default function OverlapChecker() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Visit Overlap Checker"
          subtitle="Detect overlapping caregiver visits from an HHAeXchange Excel export"
        />
        <div className="flex-1 overflow-hidden">
          <iframe
            src="/tools/overlap-checker.html"
            className="w-full h-full border-0"
            title="Visit Overlap Checker"
            data-testid="iframe-overlap-checker"
          />
        </div>
      </main>
    </div>
  );
}
