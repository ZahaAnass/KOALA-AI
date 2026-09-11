import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { modKey } from "@/lib/utils";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useOnlineStatus } from "@/hooks/usePwa";
import { useUser } from "@/hooks/useUser";
import { useChatStore } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Dialog } from "@/components/ui/Dialog";
import { Kbd, Spinner } from "@/components/ui/Feedback";
import { CommandPalette } from "@/components/search/CommandPalette";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { Sidebar } from "./Sidebar";

const TOUR_KEY = "koala:tour-done";

/** Authenticated application frame: sidebar, global dialogs, shortcuts and the routed page. */
export function AppShell() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }
  if (!isSignedIn) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return <Shell />;
}

function Shell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: user } = useUser();
  useOnlineStatus();

  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const cycleTheme = useUi((s) => s.cycleTheme);
  const shortcutsOpen = useUi((s) => s.shortcutsOpen);
  const setShortcutsOpen = useUi((s) => s.setShortcutsOpen);
  const stop = useChatStore((s) => s.stop);

  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    const forced = params.get("tour") === "1";
    const done = localStorage.getItem(TOUR_KEY) === "1";
    if (user && (forced || (!user.onboarded && !done))) setTourOpen(true);
  }, [user, params]);

  const finishTour = () => {
    setTourOpen(false);
    localStorage.setItem(TOUR_KEY, "1");
    if (params.has("tour")) {
      params.delete("tour");
      setParams(params, { replace: true });
    }
    if (user && !user.onboarded) void api.users.onboarded();
  };

  const hotkeys = useMemo(
    () => [
      { key: "k", mod: true, handler: () => setPaletteOpen(true) },
      { key: "o", mod: true, shift: true, handler: () => navigate("/dashboard") },
      { key: "b", mod: true, handler: toggleSidebar },
      { key: "l", mod: true, shift: true, handler: cycleTheme },
      { key: "Escape", global: true, handler: stop },
      { key: "?", shift: true, handler: () => setShortcutsOpen(true) },
    ],
    [cycleTheme, navigate, setPaletteOpen, setShortcutsOpen, stop, toggleSidebar],
  );
  useHotkeys(hotkeys);

  const shortcuts = [
    { keys: [modKey, "K"], label: t("shortcuts.search") },
    { keys: [modKey, "⇧", "O"], label: t("shortcuts.newChat") },
    { keys: [modKey, "B"], label: t("shortcuts.toggleSidebar") },
    { keys: [modKey, "⇧", "L"], label: t("shortcuts.theme") },
    { keys: ["/"], label: t("shortcuts.focus") },
    { keys: ["Esc"], label: t("shortcuts.stop") },
    { keys: ["?"], label: t("shortcuts.help") },
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Mobile overlay */}
      {sidebarOpen && <button type="button" aria-label={t("common.close")} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" />}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:hidden"}`}>
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>

      <CommandPalette />
      <OnboardingTour open={tourOpen} onClose={finishTour} />
      <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title={t("settings.shortcuts")} size="sm">
        <ul className="flex flex-col gap-2 text-sm">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between">
              <span className="text-fg-muted">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
