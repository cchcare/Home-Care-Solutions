import { useEffect, useState } from "react";
import { AlertTriangle, Lightbulb, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setErrorDiagnosisCallback, clearErrorDiagnosisCallback, type ErrorDiagnosis } from "@/lib/queryClient";

interface DiagnosisDisplay {
  diagnosis: ErrorDiagnosis;
  originalError: string;
  id: string;
}

export function ErrorDiagnosisToast() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisDisplay[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setErrorDiagnosisCallback((diagnosis: ErrorDiagnosis, originalError: string) => {
      const id = `diagnosis-${Date.now()}`;
      setDiagnoses((prev) => [...prev.slice(-2), { diagnosis, originalError, id }]);
      
      setTimeout(() => {
        setDiagnoses((prev) => prev.filter((d) => d.id !== id));
      }, 30000);
    });

    return () => {
      clearErrorDiagnosisCallback();
    };
  }, []);

  const dismissDiagnosis = (id: string) => {
    setDiagnoses((prev) => prev.filter((d) => d.id !== id));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500 bg-red-50 dark:bg-red-950";
      case "high":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950";
      case "medium":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      default:
        return "border-blue-500 bg-blue-50 dark:bg-blue-950";
    }
  };

  const getSeverityIcon = (severity: string) => {
    const baseClass = "h-5 w-5";
    switch (severity) {
      case "critical":
        return <AlertTriangle className={`${baseClass} text-red-500`} />;
      case "high":
        return <AlertTriangle className={`${baseClass} text-orange-500`} />;
      case "medium":
        return <AlertTriangle className={`${baseClass} text-yellow-500`} />;
      default:
        return <Lightbulb className={`${baseClass} text-blue-500`} />;
    }
  };

  if (diagnoses.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md" data-testid="error-diagnosis-container">
      {diagnoses.map(({ diagnosis, originalError, id }) => (
        <div
          key={id}
          className={`rounded-lg border-l-4 p-4 shadow-lg ${getSeverityColor(diagnosis.severity)}`}
          data-testid={`error-diagnosis-${id}`}
        >
          <div className="flex items-start gap-3">
            {getSeverityIcon(diagnosis.severity)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  AI Error Diagnosis
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => dismissDiagnosis(id)}
                  data-testid={`dismiss-diagnosis-${id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {diagnosis.diagnosis}
              </p>
              
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className={`px-2 py-0.5 rounded-full text-white ${
                  diagnosis.severity === "critical" ? "bg-red-500" :
                  diagnosis.severity === "high" ? "bg-orange-500" :
                  diagnosis.severity === "medium" ? "bg-yellow-500" :
                  "bg-blue-500"
                }`}>
                  {diagnosis.severity.toUpperCase()}
                </span>
              </div>
              
              <button
                onClick={() => setExpandedId(expandedId === id ? null : id)}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                data-testid={`toggle-details-${id}`}
              >
                {expandedId === id ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    View details & fix
                  </>
                )}
              </button>
              
              {expandedId === id && (
                <div className="mt-3 space-y-3 border-t pt-3 dark:border-gray-700">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      Suggested Fix
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {diagnosis.suggestedFix}
                    </p>
                  </div>
                  
                  {diagnosis.possibleCauses && diagnosis.possibleCauses.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                        Possible Causes
                      </h5>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {diagnosis.possibleCauses.map((cause, index) => (
                          <li key={index}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2 dark:border-gray-700">
                    <span className="font-medium">Original error:</span>{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-red-600 dark:text-red-400">
                      {originalError.length > 100 ? `${originalError.substring(0, 100)}...` : originalError}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
