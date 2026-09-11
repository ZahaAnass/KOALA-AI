import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { ArrowRight, FileText, Github, Globe, ImageIcon, MessageSquare, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/ZahaAnass/KOALA-AI";

/** Types `text` one character at a time, then holds. Restarts when `text` changes. */
function useTypewriter(text: string, speed = 28, startDelay = 0): string {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) timer = setTimeout(tick, speed);
    };
    timer = setTimeout(tick, startDelay);
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);
  return shown;
}

function Header() {
  const { t } = useTranslation();
  return (
    <header className="glass sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <img src="/logo.png" alt="" className="size-9" />
          KOALA AI
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#features" className="hidden rounded-xl px-3 py-2 text-sm text-fg-muted hover:bg-bg-hover hover:text-fg sm:block">
            {t("landing.ctaSecondary")}
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-xl p-2 text-fg-muted hover:bg-bg-hover hover:text-fg" aria-label="GitHub">
            <Github className="size-5" />
          </a>
          <SignedOut>
            <Link to="/sign-in" className="rounded-xl px-3 py-2 text-sm font-medium text-fg-muted hover:bg-bg-hover hover:text-fg">
              {t("nav.signIn")}
            </Link>
            <Link to="/sign-up">
              <Button size="sm">{t("nav.signUp")}</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="sm" rightIcon={<ArrowRight className="size-4" />}>
                {t("nav.chats")}
              </Button>
            </Link>
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}

function ChatPreview() {
  const question = useTypewriter("Explain how koalas sleep 20 hours a day 🐨", 30, 400);
  const answer = useTypewriter("Eucalyptus leaves are low in energy and mildly toxic, so koalas conserve energy by sleeping most of the day while their liver does the heavy lifting.", 14, 2200);
  return (
    <div className="glass w-full max-w-md rounded-3xl p-4 shadow-2xl shadow-brand-500/10">
      <div className="mb-3 flex items-center gap-2 text-xs text-fg-subtle">
        <span className="size-2 rounded-full bg-emerald-400" />
        gemini-2.5-flash · streaming
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-user-bubble px-3.5 py-2.5">{question}</div>
        <div className="flex max-w-[92%] items-start gap-2">
          <img src="/logo.png" alt="" className="mt-0.5 size-6 shrink-0" />
          <div className="rounded-2xl rounded-bl-md bg-bg-muted px-3.5 py-2.5 leading-relaxed">
            {answer}
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse-soft bg-brand-500 align-middle" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden">
      <img src="/orbital.png" alt="" aria-hidden className="pointer-events-none absolute -left-1/4 -top-1/3 w-[90vw] max-w-5xl animate-spin-slow opacity-[0.07] dark:opacity-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="animate-slide-up text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-fg-muted">
            <Sparkles className="size-3.5 text-accent-500" />
            {t("app.tagline")}
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="gradient-text">KOALA AI</span>
            <br />
            {t("landing.hero")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-fg-muted sm:text-lg lg:mx-0">{t("landing.sub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link to="/dashboard">
              <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
                {t("landing.cta")}
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                {t("landing.ctaSecondary")}
              </Button>
            </a>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <div className="relative flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden rounded-[2.5rem] bg-[#140e2d]">
            <div className="absolute inset-0 w-[200%] bg-[url('/bg.png')] bg-auto opacity-20 animate-slide-bg" />
            <img src="/bot.png" alt="" className="relative h-4/5 animate-float object-contain drop-shadow-2xl" />
          </div>
          <div className="w-full lg:absolute lg:-bottom-10 lg:-right-6 lg:w-auto">
            <ChatPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="surface group rounded-3xl p-6 transition-transform hover:-translate-y-1">
      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-brand-500 [&>svg]:size-5">{icon}</span>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-fg-muted">{text}</p>
    </div>
  );
}

function Features() {
  const { t } = useTranslation();
  const items = [
    { key: "chat", icon: <MessageSquare /> },
    { key: "vision", icon: <ImageIcon /> },
    { key: "search", icon: <Globe /> },
    { key: "docs", icon: <FileText /> },
    { key: "tools", icon: <Wrench /> },
    { key: "privacy", icon: <ShieldCheck /> },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.features.title")}</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <FeatureCard key={f.key} icon={f.icon} title={t(`landing.features.${f.key}.title`)} text={t(`landing.features.${f.key}.text`)} />
        ))}
      </div>
    </section>
  );
}

function BrowserFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={cn("surface overflow-hidden rounded-3xl", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-bg-muted px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
      </div>
      <img src={src} alt={alt} className="w-full" loading="lazy" />
    </figure>
  );
}

function Screenshots() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <BrowserFrame src="/Dashboard.png" alt="KOALA AI dashboard" />
        <BrowserFrame src="/chat.png" alt="KOALA AI chat" />
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { n: "1", title: t("nav.signUp"), text: t("landing.steps.signUp") },
    { n: "2", title: t("nav.newChat"), text: t("landing.steps.chat") },
    { n: "3", title: t("landing.features.privacy.title"), text: t("landing.features.privacy.text") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-4 rounded-3xl border border-border p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-semibold text-white">{s.n}</span>
            <div>
              <p className="font-display font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-fg-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-500 to-accent-500 px-6 py-14 text-center text-white">
        <img src="/orbital.png" alt="" aria-hidden className="pointer-events-none absolute -right-1/4 -top-1/2 w-[60vw] max-w-2xl animate-spin-slow opacity-20" />
        <h2 className="relative font-display text-3xl font-semibold sm:text-4xl">{t("landing.demo")}</h2>
        <p className="relative mx-auto mt-3 max-w-lg text-white/85">{t("landing.sub")}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button size="lg" className="bg-white text-brand-600 hover:bg-white/90">
              {t("landing.cta")}
            </Button>
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" leftIcon={<Github className="size-4" />}>
              {t("landing.openSource")}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="size-6" />
          <span>{t("landing.footer")}</span>
        </div>
        <nav className="flex gap-5">
          <Link to="/" className="hover:text-fg">{t("landing.footerLinks.terms")}</Link>
          <Link to="/" className="hover:text-fg">{t("landing.footerLinks.privacy")}</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-fg">{t("landing.footerLinks.github")}</a>
          <Link to="/contact" className="hover:text-fg">{t("nav.contact")}</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main>
        <Hero />
        <Features />
        <Screenshots />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
