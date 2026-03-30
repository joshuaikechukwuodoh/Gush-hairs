import * as React from "react";
import { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const state = (this as any).state;
    const props = (this as any).props;

    if (state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(state.error?.message || "");
        if (parsedError.error && parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = `Permission Denied: You don't have access to ${parsedError.path || 'this resource'}. Operation: ${parsedError.operationType}`;
        }
      } catch (e) {
        errorMessage = state.error?.message || errorMessage;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-3xl bg-red-50 p-8 space-y-4 max-w-md">
            <h2 className="font-blackletter text-3xl text-red-900">Application Error</h2>
            <p className="text-red-700">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-red-900 px-6 py-2 text-sm font-bold text-white hover:bg-red-800 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
