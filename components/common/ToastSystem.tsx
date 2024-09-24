"use client"

import { removeToast, toasts, type Toast } from "@/lib/signal/toastSignals";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { computed } from "@preact/signals-react";
import { useEffect, useRef } from "react";

const Toast = ({ toast }: { toast: Toast }) => {
  const colors: { [key: string]: string } = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  };

  return (
    <div
      className={`${
        colors[toast.type as keyof typeof colors]
      } text-white p-4 rounded-md shadow-md flex justify-between items-center`}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-4 focus:outline-none"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
};

const StackedToast = ({ count }: { count: number }) => {
  return (
    <div className="bg-gray-700 text-white p-4 rounded-md shadow-md flex justify-between items-center">
      <span>{count} more notifications</span>
    </div>
  );
};

export function ToastSystem() {
  const toastContainerRef = useRef<HTMLDivElement>(null);
  const visibleToasts = computed(() => toasts.value.slice(0, 5));
  const stackedCount = computed(() => toasts.value.length - 5);

  useEffect(() => {
    if (toastContainerRef.current) {
      toastContainerRef.current.style.height = `${
        visibleToasts.value.length * 70
      }px`;
    }
  }, [visibleToasts.value]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div
        ref={toastContainerRef}
        className="fixed bottom-4 right-4 w-72 space-y-2 transition-all duration-300 ease-in-out"
      >
        {visibleToasts.value.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
        {stackedCount.value > 0 && <StackedToast count={stackedCount.value} />}
      </div>
    </div>
  );
}
