import { toast as sonnerToast } from "sonner";

// Legacy Toast type definition for backward compatibility
export type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

// Compatibility layer that maps your existing API to sonner
const createToast = (type: Toast["type"]) => (...messages: string[]): void => {
  const message = messages.join(' ');

  switch (type) {
    case "success":
      sonnerToast.success(message);
      break;
    case "error":
      sonnerToast.error(message);
      break;
    case "info":
      sonnerToast.info(message);
      break;
    case "warning":
      sonnerToast.warning(message);
      break;
    default:
      sonnerToast(message);
  }
};

export const toast = {
  success: createToast("success"),
  error: createToast("error"),
  info: createToast("info"),
  warning: createToast("warning"),
};

// Legacy exports for backward compatibility (no longer used but kept for safety)
export const toasts = { value: [] as Toast[] };
