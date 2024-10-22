"use client";

import { removeToast, toasts, type Toast } from "@/lib/signal/toastSignals";
import { computed } from "@preact/signals-react";
import { useSignalEffect, useSignals } from "@preact/signals-react/runtime";
import { X } from "lucide-react";
import { useRef } from "react";

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
        <X className="size-4" />
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

export default function ToastSystem() {
  const toastContainerRef = useRef<HTMLDivElement>(null);
  const visibleToasts = computed(() => toasts.value.slice(0, 5));
  const stackedCount = computed(() => toasts.value.length - 5);

  useSignals();

  const TOAST_HEIGHT = 70;
  // const STACKED_TOAST_HEIGHT = 70;

  useSignalEffect(() => {
    if (toastContainerRef.current) {
     const height = (visibleToasts.value.length + (stackedCount.value > 0 ? 1 : 0)) * TOAST_HEIGHT
      toastContainerRef.current.style.height = `${height}px`
    }
  });

  return (
    <div
      ref={toastContainerRef}
      className="fixed bottom-4 right-4 w-72 space-y-2 transition-all duration-300 ease-in-out"
    >
      {visibleToasts.value.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
      {stackedCount.value > 0 && <StackedToast count={stackedCount.value} />}
    </div>
  );
}
