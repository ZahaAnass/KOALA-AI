import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Exposes the deferred PWA install prompt when the browser offers one. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
  };

  return { canInstall: Boolean(deferred) && !installed, installed, install };
}

/** Shows a toast when the network connection changes. */
export function useOnlineStatus(): boolean {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => {
      setOnline(true);
      toast.success(t("common.online"));
    };
    const down = () => {
      setOnline(false);
      toast.warning(t("common.offline"));
    };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [t]);
  return online;
}
