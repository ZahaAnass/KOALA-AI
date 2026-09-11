import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { setLocale } from "@/i18n";
import { useUi } from "@/store/ui";
import type { Settings, User } from "@/types/api";

/** Current user profile, settings and quota. Syncs server theme/locale preferences locally. */
export function useUser() {
  const query = useQuery({ queryKey: queryKeys.me, queryFn: api.users.me, staleTime: 60_000 });
  const setTheme = useUi((s) => s.setTheme);

  useEffect(() => {
    const settings = query.data?.settings;
    if (!settings) return;
    if (settings.theme !== useUi.getState().theme) setTheme(settings.theme);
    setLocale(settings.locale);
  }, [query.data?.settings, setTheme]);

  return query;
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => api.users.updateSettings(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: queryKeys.me });
      const previous = qc.getQueryData<User>(queryKeys.me);
      if (previous) qc.setQueryData<User>(queryKeys.me, { ...previous, settings: { ...previous.settings, ...patch } });
      return { previous };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.me, ctx.previous);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    },
    onSuccess: (user) => qc.setQueryData(queryKeys.me, user),
  });
}

export function useModels() {
  return useQuery({ queryKey: queryKeys.models, queryFn: api.models, staleTime: 5 * 60_000 });
}
