import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Github, Linkedin, Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/Feedback";

interface Channel {
  icon: ReactNode;
  title: string;
  text: string;
  href: string;
  label: string;
}

function ChannelCard({ icon, title, text, href, label }: Channel) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="surface group flex flex-col items-center gap-3 rounded-3xl p-7 text-center transition-transform hover:-translate-y-1"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500/20 [&>svg]:size-7">
        {icon}
      </span>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-sm text-fg-muted">{text}</p>
      <span className="mt-1 text-sm font-medium text-brand-500 group-hover:underline">{label}</span>
    </a>
  );
}

export default function ContactPage() {
  const { t } = useTranslation();
  const channels: Channel[] = [
    { icon: <Mail />, title: t("contact.email"), text: t("contact.emailText"), href: "mailto:zahaanass277@gmail.com", label: "zahaanass277@gmail.com" },
    { icon: <Github />, title: t("contact.github"), text: t("contact.githubText"), href: "https://github.com/ZahaAnass", label: "github.com/ZahaAnass" },
    { icon: <Linkedin />, title: t("contact.linkedin"), text: t("contact.linkedinText"), href: "https://www.linkedin.com/in/zaha-anas-101796334/", label: "linkedin.com/in/zaha-anas" },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader title={t("contact.title")} subtitle={t("contact.subtitle")} />
      <div className="grid gap-5 sm:grid-cols-3">
        {channels.map((c) => (
          <ChannelCard key={c.href} {...c} />
        ))}
      </div>
      <section className="mt-12 rounded-3xl border border-border bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10 p-8 text-center">
        <h3 className="font-display text-xl font-semibold">{t("contact.build")}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-fg-muted">{t("contact.buildText")}</p>
      </section>
    </div>
  );
}
