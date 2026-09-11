import { UserButton } from "@clerk/clerk-react";
import { Languages, Moon, PanelLeft, Sun, SunMoon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { currentLocale, setLocale, type SupportedLocale } from "@/i18n";
import { useUpdateSettings } from "@/hooks/useUser";
import { useUi } from "@/store/ui";
import type { Theme } from "@/types/api";
import { IconButton } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";

interface HeaderProps {
  title?: string;
  /** Extra controls rendered next to the title (for example the chat menu). */
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  const { t } = useTranslation();
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const sidebarOpen = useUi((s) => s.sidebarOpen);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg/80 px-3 backdrop-blur">
      <IconButton label={t("nav.toggleSidebar")} onClick={toggleSidebar} className={sidebarOpen ? "lg:hidden" : ""}>
        <PanelLeft />
      </IconButton>
      {!sidebarOpen && (
        <span className="hidden items-center gap-2 font-display text-sm font-semibold lg:flex">
          <img src="/logo.png" alt="" className="size-6" />
          {t("app.name")}
        </span>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1 px-1">
        {title && <h1 className="truncate text-sm font-medium">{title}</h1>}
        {actions}
      </div>
      <ThemeToggle />
      <LanguageToggle current={currentLocale()} />
      <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
    </header>
  );
}

function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const update = useUpdateSettings();
  const icons: Record<Theme, React.ReactNode> = { light: <Sun />, dark: <Moon />, system: <SunMoon /> };

  const choose = (next: Theme) => {
    setTheme(next);
    update.mutate({ theme: next });
  };

  return (
    <Menu>
      <MenuTrigger>
        <IconButton label={t("theme.label")}>{icons[theme]}</IconButton>
      </MenuTrigger>
      <MenuContent>
        {(["light", "dark", "system"] as Theme[]).map((option) => (
          <MenuItem key={option} icon={icons[option]} onSelect={() => choose(option)}>
            {t(`theme.${option}`)}
            {option === theme && <span className="ml-2 text-brand-500">•</span>}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function LanguageToggle({ current }: { current: SupportedLocale }) {
  const { t } = useTranslation();
  const update = useUpdateSettings();
  const choose = (locale: SupportedLocale) => {
    setLocale(locale);
    update.mutate({ locale });
  };
  return (
    <Menu>
      <MenuTrigger>
        <IconButton label={t("language.label")}>
          <Languages />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        {(["en", "fr"] as SupportedLocale[]).map((locale) => (
          <MenuItem key={locale} onSelect={() => choose(locale)}>
            {t(`language.${locale}`)}
            {locale === current && <span className="ml-2 text-brand-500">•</span>}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
