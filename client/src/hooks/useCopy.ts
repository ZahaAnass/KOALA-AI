import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/utils";

/** Copies text to the clipboard and exposes a short-lived `copied` flag for UI feedback. */
export function useCopy(resetAfterMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      if (!(await copyToClipboard(text))) return false;
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), resetAfterMs);
      return true;
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
