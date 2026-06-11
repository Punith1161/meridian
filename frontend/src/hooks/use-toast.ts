/**
 * use-toast — thin wrapper around Sonner so existing components
 * that call useToast() keep working without modification.
 */
import { toast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastOptions) => {
      const message = title ?? "";
      const opts = description ? { description } : undefined;
      if (variant === "destructive") {
        toast.error(message, opts);
      } else {
        toast.success(message, opts);
      }
    },
  };
}
