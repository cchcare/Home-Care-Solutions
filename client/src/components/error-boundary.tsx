import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Route-level error boundary. Without this, any uncaught render error
 * unmounts the entire React tree and the user sees a blank white page with
 * no explanation. With it, the user sees what failed and can reload or go
 * back to the dashboard, and the error text can be reported to support.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] render error:", error, info.componentStack);
    // Best-effort report to the server error log; never let this throw.
    try {
      fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: error.message,
          stack: (error.stack || "").slice(0, 4000),
          componentStack: (info.componentStack || "").slice(0, 2000),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-lg w-full text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">This page hit an error</h1>
            <p className="text-sm text-muted-foreground">
              Something went wrong while displaying this page. Reloading usually fixes it.
              If it keeps happening, share the message below with support.
            </p>
            <pre className="text-xs text-left bg-muted rounded-lg p-3 overflow-x-auto max-h-40 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.href = "/";
                }}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
