import { AnimatePresence, motion as Motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ErrorBanner = ({
  error,
  onRetry,
  className = "",
  actionLabel = "Retry",
}) => (
  <AnimatePresence>
    {error ? (
      <Motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`bg-red-50 p-4 rounded-2xl flex items-center justify-between border border-red-100 ${className}`}
      >
        <div className="flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertTriangle size={18} /> {error}
        </div>
        {onRetry ? (
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 bg-white"
            onClick={onRetry}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Motion.div>
    ) : null}
  </AnimatePresence>
);

export default ErrorBanner;
