"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";

export interface CaptchaHandle {
  reset(): void;
}

interface CaptchaProps {
  siteKey: string;
  ref?: Ref<CaptchaHandle>;
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function Captcha({
  ref,
  siteKey,
  onSuccess,
  onError,
  onExpire,
}: CaptchaProps) {
  const widget = useRef<TurnstileInstance>(null);
  const [status, setStatus] = useState("Ready");
  const local =
    Boolean(process.env.NEXT_PUBLIC_E2E_RUN_ID) && siteKey === "local-e2e";
  useImperativeHandle(ref, () => ({
    reset() {
      setStatus("Ready");
      widget.current?.reset();
    },
  }));

  if (!local) {
    return (
      <Turnstile
        ref={widget}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
    );
  }

  return (
    <fieldset className="rounded border p-3 text-sm">
      <legend>Local test verification</legend>
      <p role="status">{status}</p>
      <button
        type="button"
        disabled={status === "Verified"}
        onClick={() => {
          setStatus("Verified");
          onSuccess("local-e2e-fixture");
        }}
      >
        Verify for local test
      </button>
      <button
        type="button"
        className="ml-3"
        onClick={() => {
          setStatus("Error");
          onError?.();
        }}
      >
        Test error
      </button>
      <button
        type="button"
        className="ml-3"
        onClick={() => {
          setStatus("Expired");
          onExpire?.();
        }}
      >
        Test expiration
      </button>
    </fieldset>
  );
}
