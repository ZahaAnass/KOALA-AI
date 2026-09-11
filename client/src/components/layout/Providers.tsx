import { useEffect, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { setTokenGetter } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useUi } from "@/store/ui";

/** Wires Clerk's session token into the API client once auth is ready. */
function AuthBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  useEffect(() => {
    if (isLoaded) setTokenGetter(() => getToken());
  }, [getToken, isLoaded]);
  return children;
}

function ThemedToaster() {
  const theme = useUi((s) => s.theme);
  return <Toaster theme={theme} position="bottom-right" richColors closeButton toastOptions={{ className: "font-sans" }} />;
}

/** Application-wide providers: auth, server state, toasts. */
export function Providers({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <QueryClientProvider client={queryClient}>
        <AuthBridge>
          {children}
          <ThemedToaster />
        </AuthBridge>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
