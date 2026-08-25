/**
 * Atelier Terminal design system: a developer identity workbench with deliberate
 * asymmetry, ink/paper surfaces, copper signals, and readable studio controls.
 * See /ideas.md for the chosen design philosophy.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Github,
  Globe2,
  Linkedin,
  Link2,
  LoaderCircle,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  Twitter,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Accent = "copper" | "mint" | "violet";
type Template = "editorial" | "terminal" | "paper";
type LoadingStage = "profile" | "repositories" | "composition";

type GithubProfile = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
};

type WorkItem = {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  stars?: number;
  url: string;
  source: "github" | "manual";
};

type ProfileCard = GithubProfile & {
  stars: number;
  languages: string[];
  projects: WorkItem[];
};

type NewProject = { name: string; description: string; url: string; language: string };
type Socials = { linkedin: string; portfolio: string; x: string };

const accents: Record<Accent, { name: string; hex: string; className: string }> = {
  copper: { name: "Copper signal", hex: "#D97845", className: "bg-[#d97845]" },
  mint: { name: "Mint pulse", hex: "#93e0bd", className: "bg-[#93e0bd]" },
  violet: { name: "Ink violet", hex: "#a995e8", className: "bg-[#a995e8]" },
};

const templates: Array<{ id: Template; title: string; subtitle: string; short: string }> = [
  { id: "editorial", title: "Editorial", subtitle: "Built to be remembered.", short: "ED" },
  { id: "terminal", title: "Terminal", subtitle: "For your README.", short: "TM" },
  { id: "paper", title: "Paper", subtitle: "Quietly confident.", short: "PR" },
];

const emptyProject: NewProject = { name: "", description: "", url: "", language: "" };

function isAccent(value: string | null): value is Accent {
  return value === "copper" || value === "mint" || value === "violet";
}

function isTemplate(value: string | null): value is Template {
  return value === "editorial" || value === "terminal" || value === "paper";
}

function extractHandle(value: string) {
  const trimmed = value.trim().replace(/^@/, "");
  const githubUrl = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
  return (githubUrl?.[1] ?? trimmed).replace(/\/$/, "");
}

function safeUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return "";
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatSince(createdAt: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(createdAt));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[var(--line)] pl-4 first:border-l-0 first:pl-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-ink)]">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tracking-tight text-[var(--ink)]">{value}</p>
    </div>
  );
}

function LoadingOverlay({ stage }: { stage: LoadingStage }) {
  const messages: Record<LoadingStage, { index: string; title: string; text: string }> = {
    profile: { index: "01", title: "Reading the profile", text: "Retrieving public identity details from GitHub." },
    repositories: { index: "02", title: "Cataloguing public work", text: "Looking for languages, repositories and project signals." },
    composition: { index: "03", title: "Composing your card", text: "Laying out the profile for a shareable identity surface." },
  };
  const active = messages[stage];

  return (
    <div className="absolute inset-2 z-20 grid place-items-center overflow-hidden bg-[var(--base)]/90 p-6 backdrop-blur-sm">
      <div className="loading-scan absolute inset-x-0 top-0 h-px bg-[var(--signal)]" />
      <div className="max-w-xs text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center border border-[var(--signal)] text-[var(--signal)]"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--signal)]">Stage {active.index} / 03</p>
        <p className="mt-2 font-display text-xl font-bold text-[var(--ink)]">{active.title}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">{active.text}</p>
        <div className="mt-5 flex justify-center gap-1.5">{(["profile", "repositories", "composition"] as LoadingStage[]).map((item) => <span key={item} className={`h-1 w-9 ${item === stage ? "bg-[var(--signal)]" : "bg-[var(--line)]"}`} />)}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const cardRef = useRef<HTMLElement>(null);
  const launchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialHandle = launchParams.get("u") || "mohamed-khairy-5i";
  const initialAccent = launchParams.get("accent");
  const initialTemplate = launchParams.get("template");
  const [input, setInput] = useState(initialHandle);
  const [profile, setProfile] = useState<ProfileCard | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("profile");
  const [error, setError] = useState("");
  const [accent, setAccent] = useState<Accent>(() => isAccent(initialAccent) ? initialAccent : "copper");
  const [template, setTemplate] = useState<Template>(() => isTemplate(initialTemplate) ? initialTemplate : "editorial");
  const [showStats, setShowStats] = useState(true);
  const [isCustomizerOpen, setCustomizerOpen] = useState(true);
  const [manualProjects, setManualProjects] = useState<WorkItem[]>([]);
  const [newProject, setNewProject] = useState<NewProject>(emptyProject);
  const [socials, setSocials] = useState<Socials>({ linkedin: "", portfolio: "", x: "" });
  const [isExporting, setIsExporting] = useState<"png" | "pdf" | null>(null);

  const cssAccent = accents[accent].hex;
  const currentTemplate = templates.find((item) => item.id === template)!;
  const selectedWork = manualProjects.length ? manualProjects : profile?.projects ?? [];
  const socialLinks = [
    { id: "linkedin" as const, label: "LinkedIn", value: safeUrl(socials.linkedin), icon: Linkedin },
    { id: "portfolio" as const, label: "Portfolio", value: safeUrl(socials.portfolio || profile?.blog || ""), icon: Globe2 },
    { id: "x" as const, label: "X / Twitter", value: safeUrl(socials.x), icon: Twitter },
  ].filter((item) => item.value);

  const cardStyle = useMemo(
    () => ({
      "--signal": cssAccent,
      "--card-image": template === "paper" ? "url('/manus-storage/devcard-paper-texture_b87454ea.png')" : "url('/manus-storage/devcard-card-accent_05e1c21c.png')",
    }) as CSSProperties,
    [cssAccent, template]
  );

  async function loadProfile(rawValue = input) {
    const handle = extractHandle(rawValue);
    if (!handle || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(handle)) {
      setStatus("error");
      setError("Use a GitHub handle or a complete github.com profile URL.");
      return;
    }

    setInput(handle);
    setStatus("loading");
    setLoadingStage("profile");
    setError("");
    const repositoryTimer = window.setTimeout(() => setLoadingStage("repositories"), 420);
    const compositionTimer = window.setTimeout(() => setLoadingStage("composition"), 920);

    try {
      const [profileResponse, reposResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`),
        fetch(`https://api.github.com/users/${encodeURIComponent(handle)}/repos?per_page=100&sort=updated`),
      ]);

      if (profileResponse.status === 404) throw new Error("We could not find that public GitHub profile.");
      if (!profileResponse.ok) throw new Error("GitHub could not provide profile data right now. Try again shortly.");
      if (!reposResponse.ok) throw new Error("GitHub profile loaded, but repository data is temporarily unavailable.");

      const profileData = (await profileResponse.json()) as GithubProfile;
      const repos = (await reposResponse.json()) as Array<{
        name: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
        html_url: string;
        fork: boolean;
      }>;
      const languageCounts = repos.reduce<Record<string, number>>((result, repo) => {
        if (repo.language) result[repo.language] = (result[repo.language] ?? 0) + 1;
        return result;
      }, {});

      setProfile({
        ...profileData,
        stars: repos.reduce((total, repo) => total + repo.stargazers_count, 0),
        languages: Object.entries(languageCounts).sort(([, a], [, b]) => b - a).slice(0, 4).map(([language]) => language),
        projects: repos.filter((repo) => !repo.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3).map((repo) => ({
          id: `gh-${repo.name}`,
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          url: repo.html_url,
          source: "github",
        })),
      });
      window.setTimeout(() => setStatus("ready"), 210);
    } catch (caughtError) {
      setStatus("error");
      setError(caughtError instanceof Error ? caughtError.message : "Something stopped the profile from loading.");
    } finally {
      window.clearTimeout(repositoryTimer);
      window.clearTimeout(compositionTimer);
    }
  }

  useEffect(() => {
    void loadProfile(initialHandle);
    // A share link restores the public profile and visual recipe encoded in its query string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addManualProject() {
    const url = safeUrl(newProject.url);
    if (!newProject.name.trim() || !url) {
      toast.error("Give the project a name and a valid public link first.");
      return;
    }
    const manual: WorkItem = {
      id: `manual-${Date.now()}`,
      name: newProject.name.trim(),
      description: newProject.description.trim() || "Independent project selected for this card.",
      language: newProject.language.trim() || "Project",
      url,
      source: "manual",
    };
    setManualProjects((items) => [manual, ...items].slice(0, 4));
    setNewProject(emptyProject);
    toast.success("Project added to the card selection.");
  }

  function removeManualProject(id: string) {
    setManualProjects((items) => items.filter((item) => item.id !== id));
  }

  async function copyShareLink() {
    const handle = profile?.login ?? extractHandle(input);
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("u", handle);
    shareUrl.searchParams.set("template", template);
    shareUrl.searchParams.set("accent", accent);
    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      toast.success("Share link copied to clipboard.");
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  }

  async function buildCanvas() {
    if (!cardRef.current) throw new Error("Load a profile before exporting the card.");
    return html2canvas(cardRef.current, { backgroundColor: theme === "dark" ? "#1a1d1a" : "#f1eadc", scale: 2, useCORS: true, logging: false, windowWidth: cardRef.current.scrollWidth });
  }

  async function exportCard(format: "png" | "pdf") {
    if (!profile) {
      toast.error("Load a public profile before exporting the card.");
      return;
    }
    setIsExporting(format);
    try {
      const canvas = await buildCanvas();
      const fileName = `${profile.login}-devcard`;
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL("image/png", 1);
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height], compress: true });
        pdf.addImage(canvas.toDataURL("image/png", 0.95), "PNG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
        pdf.save(`${fileName}.pdf`);
      }
      toast.success(`${format.toUpperCase()} card prepared for download.`);
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : "The export could not be completed.");
    } finally {
      setIsExporting(null);
    }
  }

  function resetStudio() {
    setAccent("copper");
    setTemplate("editorial");
    setShowStats(true);
    toast.message("Studio controls restored.");
  }

  return (
    <div className={`studio-shell min-h-screen overflow-x-hidden ${theme === "light" ? "studio-shell--light" : ""}`}>
      <div className="pointer-events-none fixed inset-0 opacity-55 [background-image:linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] [background-size:42px_42px]" />
      <header className="relative z-10 border-b border-[var(--line)] bg-[var(--base)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" className="group flex items-center gap-3" aria-label="DevSignal home">
            <span className="grid h-10 w-10 place-items-center border border-[var(--signal)]/60 bg-[var(--surface)] p-1 transition-transform duration-200 group-hover:-rotate-3"><img src="/manus-storage/devsignal-favicon_bc3f8d22.png" alt="" className="h-full w-full object-contain" /></span>
            <span><span className="block font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--muted-ink)]">identity workbench</span><span className="font-display text-base font-extrabold tracking-tight text-[var(--ink)]">DevSignal</span></span>
          </a>
          <div className="flex items-center gap-3 md:gap-6">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted-ink)] md:block">V1 / Public profiles</span>
            <button onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} className="theme-toggle group flex h-9 items-center gap-2 border border-[var(--line)] px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] transition-colors hover:border-[var(--signal)]"><span className="grid h-5 w-5 place-items-center bg-[var(--signal)] text-[var(--base)]">{theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}</span><span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span></button>
            <span className="hidden items-center gap-2 font-mono text-[11px] text-[var(--muted-ink)] lg:flex"><CircleDot className="h-3.5 w-3.5 text-[#93e0bd]" /> Status: ready</span>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10 mx-auto max-w-[1540px] px-5 pb-10 pt-7 md:px-8 md:pt-10">
        <section className="relative overflow-hidden border border-[var(--line)] bg-[var(--surface)] px-5 py-7 shadow-[0_30px_90px_rgba(0,0,0,.16)] md:px-9 md:py-10">
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.16] mix-blend-screen" style={{ backgroundImage: "url('/manus-storage/devcard-hero_e151a1ac.png')" }} />
          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl"><div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-ink)]"><span className="h-px w-8 bg-[var(--signal)]" /> Card builder / 02</div><h1 className="font-display text-4xl font-extrabold leading-[.95] tracking-[-0.055em] text-[var(--ink)] sm:text-5xl md:text-7xl">Turn your code trail<br /><span className="text-[var(--signal)]">into a calling card.</span></h1><p className="mt-6 max-w-xl text-sm leading-6 text-[var(--muted-ink)] md:text-base">Shape the work you want recruiters to see—not only what an API happens to rank first.</p></div>
            <div className="max-w-lg xl:w-[460px]">
              <form onSubmit={(event) => { event.preventDefault(); void loadProfile(); }} className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="github-handle">GitHub handle</label><div className="flex min-w-0 flex-1 items-center border border-[var(--line-strong)] bg-[var(--base)] px-3 focus-within:border-[var(--signal)]"><Github className="mr-2 h-4 w-4 text-[var(--muted-ink)]" /><Input id="github-handle" value={input} onChange={(event) => setInput(event.target.value)} placeholder="GitHub handle or profile URL" className="h-12 min-w-0 border-0 bg-transparent px-0 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--muted-ink)] focus-visible:ring-0" /></div><Button type="submit" disabled={status === "loading"} className="h-12 rounded-none bg-[var(--signal)] px-5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--base)] hover:brightness-110">{status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Bring it in"}{status !== "loading" && <ArrowUpRight className="ml-1 h-4 w-4" />}</Button></form>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-ink)]">Accepts @handle or any public github.com profile URL</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="order-2 xl:order-1"><div className="overflow-hidden border border-[var(--line)] bg-[var(--surface)] xl:sticky xl:top-5"><button onClick={() => setCustomizerOpen((value) => !value)} className="flex w-full items-center justify-between border-b border-[var(--line)] px-5 py-4 text-left xl:pointer-events-none"><span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]"><Palette className="h-4 w-4 text-[var(--signal)]" /> Studio controls</span><ChevronDown className={`h-4 w-4 text-[var(--ink)] transition-transform xl:hidden ${isCustomizerOpen ? "rotate-180" : ""}`} /></button>
            <div className={`${isCustomizerOpen ? "block" : "hidden"} xl:block`}>
              <div className="border-b border-[var(--line)] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-ink)]">01 / Template</p><div className="mt-3 grid gap-2">{templates.map((item) => <button key={item.id} onClick={() => setTemplate(item.id)} className={`group flex items-center gap-3 border p-3 text-left transition-colors ${template === item.id ? "border-[var(--signal)] bg-[var(--signal)]/10" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}><span className={`grid h-9 w-9 place-items-center border font-mono text-[10px] ${template === item.id ? "border-[var(--signal)] text-[var(--signal)]" : "border-[var(--line-strong)] text-[var(--muted-ink)]"}`}>{item.short}</span><span><span className="block font-display text-sm font-bold text-[var(--ink)]">{item.title}</span><span className="block font-mono text-[10px] text-[var(--muted-ink)]">{item.subtitle}</span></span>{template === item.id && <Check className="ml-auto h-4 w-4 text-[var(--signal)]" />}</button>)}</div></div>
              <div className="border-b border-[var(--line)] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-ink)]">02 / Signal color</p><div className="mt-4 flex gap-3">{(Object.keys(accents) as Accent[]).map((value) => <button key={value} onClick={() => setAccent(value)} aria-label={`Set accent to ${accents[value].name}`} className={`grid h-10 w-10 place-items-center rounded-full border transition-transform hover:scale-105 ${accent === value ? "border-[var(--ink)]" : "border-transparent"}`}><span className={`h-7 w-7 rounded-full ${accents[value].className}`} /></button>)}</div><p className="mt-3 font-mono text-[10px] text-[var(--muted-ink)]">{accents[accent].name} / {accents[accent].hex}</p></div>
              <div className="p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-ink)]">03 / Content</p><button role="switch" aria-checked={showStats} onClick={() => setShowStats((value) => !value)} className="toggle-row mt-4 flex w-full items-center justify-between border border-[var(--line)] bg-[var(--base)] px-3 py-2.5 text-left transition-colors hover:border-[var(--signal)]"><span><span className="block font-mono text-xs text-[var(--ink)]">Live statistics</span><span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted-ink)]">{showStats ? "Visible on card" : "Hidden from card"}</span></span><span className={`toggle-track ${showStats ? "toggle-track--on" : ""}`}><span className="toggle-thumb">{showStats ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}</span></span></button><Button variant="ghost" onClick={resetStudio} className="mt-4 h-9 w-full rounded-none border border-[var(--line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-ink)] hover:bg-[var(--base)] hover:text-[var(--ink)]"><RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset controls</Button></div>
            </div></div></aside>

          <section className="order-1 min-w-0 xl:order-2"><div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-ink)]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--signal)]" /> Live composition</span><span>Frame / 1400 × 800</span></div>
            <div className="relative border border-dashed border-[var(--line-strong)] p-2 sm:p-4"><span className="absolute -left-1 -top-6 font-mono text-[9px] text-[var(--muted-ink)]">X: 00</span><span className="absolute -bottom-6 right-0 font-mono text-[9px] text-[var(--muted-ink)]">Y: 800</span>
              {status === "loading" && <LoadingOverlay stage={loadingStage} />}
              {status === "error" && <div className="absolute inset-2 z-20 grid place-items-center bg-[var(--base)]/95 p-6 text-center"><div><X className="mx-auto h-6 w-6 text-[var(--signal)]" /><p className="mt-3 font-display text-xl font-bold text-[var(--ink)]">Profile signal interrupted.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-ink)]">{error}</p><Button onClick={() => void loadProfile()} className="mt-5 rounded-none bg-[var(--signal)] font-mono text-xs uppercase tracking-wider text-[var(--base)] hover:brightness-110">Try the profile again</Button></div></div>}
              {profile ? <article ref={cardRef} className={`profile-card profile-card--${template} relative min-h-[520px] overflow-hidden bg-[var(--card)] p-5 sm:min-h-[560px] sm:p-8`} style={cardStyle}><div className="absolute inset-0 bg-[image:var(--card-image)] bg-cover bg-right opacity-[0.15] mix-blend-screen" /><div className="absolute inset-y-0 left-0 w-[7px] bg-[var(--signal)]" /><div className="relative flex h-full min-h-[480px] flex-col"><div className="flex items-start justify-between gap-5"><div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-ink)]"><Terminal className="h-4 w-4" /> Dev identity / {currentTemplate.title}</div><span className="border border-[var(--signal)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--signal)]">Live profile</span></div><div className="mt-10 flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-2xl"><p className="font-mono text-xs text-[var(--signal)]">@{profile.login}</p><h2 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[.93] tracking-[-0.055em] text-[var(--ink)] sm:text-6xl">{profile.name || profile.login}</h2><p className="mt-5 max-w-lg text-sm leading-6 text-[var(--body-ink)] sm:text-base">{profile.bio || "A developer profile, composed from public GitHub work."}</p></div><img src={profile.avatar_url} crossOrigin="anonymous" alt={`${profile.login} profile avatar`} className="h-24 w-24 border border-[var(--line-strong)] object-cover sm:h-32 sm:w-32" /></div><div className="mt-auto pt-10"><div className="flex flex-wrap gap-x-7 gap-y-3 border-y border-[var(--line)] py-5">{profile.location && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-ink)]">Based / <span className="text-[var(--ink)]">{profile.location}</span></span>}<span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-ink)]">Building since / <span className="text-[var(--ink)]">{formatSince(profile.created_at)}</span></span>{profile.company && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-ink)]">At / <span className="text-[var(--ink)]">{profile.company.replace(/^@/, "")}</span></span>}</div>{showStats && <div className="mt-7 grid grid-cols-3 gap-4 sm:max-w-xl"><Stat label="Public repos" value={formatCount(profile.public_repos)} /><Stat label="Followers" value={formatCount(profile.followers)} /><Stat label="Stars found" value={formatCount(profile.stars)} /></div>}<div className="mt-8 flex flex-wrap items-center gap-2">{profile.languages.length > 0 ? profile.languages.map((language, index) => <span key={language} className="border border-[var(--line)] bg-black/10 px-2 py-1 font-mono text-[10px] text-[var(--body-ink)]" style={index === 0 ? { borderColor: cssAccent } : undefined}>{language}</span>) : <span className="font-mono text-[10px] text-[var(--muted-ink)]">Languages appear as repositories are made public.</span>}</div>{socialLinks.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{socialLinks.map((social) => { const Icon = social.icon; return <a key={social.id} href={social.value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-[var(--line)] px-2 py-1 font-mono text-[10px] text-[var(--ink)] transition-colors hover:border-[var(--signal)] hover:text-[var(--signal)]"><Icon className="h-3 w-3" /> {social.label}<ExternalLink className="h-2.5 w-2.5" /></a>; })}</div>}</div></div></article> : <div className="grid min-h-[520px] place-items-center bg-[var(--card)] p-8 text-center"><div><Sparkles className="mx-auto h-7 w-7 text-[var(--signal)]" /><h2 className="mt-4 font-display text-3xl font-bold text-[var(--ink)]">Your card is waiting.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted-ink)]">Bring in a public GitHub profile to turn its work into an editable calling card.</p></div></div>}</div>

            <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-ink)]">{manualProjects.length ? "Manually selected work" : "GitHub suggested work"}</p><span className="font-mono text-[10px] text-[var(--signal)]">{manualProjects.length ? "Your picks" : "from GitHub"}</span></div>{selectedWork.length ? <div className="mt-5 grid gap-3">{selectedWork.map((project, index) => <div key={project.id} className="group flex items-start gap-3 border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0"><span className="font-mono text-[10px] text-[var(--muted-ink)]">0{index + 1}</span><a href={project.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><span className="flex items-center gap-2 font-display text-base font-bold text-[var(--ink)] group-hover:text-[var(--signal)]">{project.name}<ExternalLink className="h-3.5 w-3.5" /></span><span className="mt-1 block line-clamp-1 text-xs text-[var(--muted-ink)]">{project.description || "No project description provided."}</span></a><span className="font-mono text-[10px] text-[var(--muted-ink)]">{project.language || "—"}</span>{project.source === "manual" && <button onClick={() => removeManualProject(project.id)} aria-label={`Remove ${project.name}`} className="text-[var(--muted-ink)] hover:text-[var(--signal)]"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}</div> : <p className="mt-5 text-sm text-[var(--muted-ink)]">Add a personal project below to feature it here.</p>}</div><div className="flex flex-col justify-between border border-[var(--signal)]/35 bg-[var(--signal)]/[.07] p-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">Ready to leave the studio?</p><h3 className="mt-3 font-display text-2xl font-bold leading-tight text-[var(--ink)]">Your identity is ready for its next surface.</h3></div><div className="mt-6 grid gap-2"><Button onClick={copyShareLink} variant="outline" className="h-11 rounded-none border-[var(--line-strong)] bg-transparent font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--base)] hover:text-[var(--ink)]"><Copy className="mr-2 h-3.5 w-3.5" /> Copy share link</Button><Button onClick={() => void exportCard("png")} disabled={isExporting !== null} className="h-11 rounded-none bg-[var(--signal)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--base)] hover:brightness-110">{isExporting === "png" ? <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />} Export PNG</Button><Button onClick={() => void exportCard("pdf")} disabled={isExporting !== null} variant="outline" className="h-11 rounded-none border-[var(--signal)]/70 bg-transparent font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--signal)]/10 hover:text-[var(--ink)]">{isExporting === "pdf" ? <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-2 h-3.5 w-3.5" />} Export PDF</Button></div></div></div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-ink)]">Portfolio selection</p><h3 className="mt-2 font-display text-xl font-bold text-[var(--ink)]">Put your best work on the card.</h3></div><span className="grid h-8 w-8 place-items-center border border-[var(--signal)] text-[var(--signal)]"><Plus className="h-4 w-4" /></span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input value={newProject.name} onChange={(event) => setNewProject((value) => ({ ...value, name: event.target.value }))} placeholder="Project name *" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)]" /><Input value={newProject.language} onChange={(event) => setNewProject((value) => ({ ...value, language: event.target.value }))} placeholder="Stack / role" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)]" /><Input value={newProject.url} onChange={(event) => setNewProject((value) => ({ ...value, url: event.target.value }))} placeholder="Public project link *" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)] sm:col-span-2" /><Input value={newProject.description} onChange={(event) => setNewProject((value) => ({ ...value, description: event.target.value }))} placeholder="One-line project summary" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)] sm:col-span-2" /></div><Button onClick={addManualProject} className="mt-4 h-10 rounded-none bg-[var(--signal)] px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--base)] hover:brightness-110"><Plus className="mr-2 h-3.5 w-3.5" /> Add highlighted project</Button></section>
              <section className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-ink)]">Contact surfaces</p><h3 className="mt-2 font-display text-xl font-bold text-[var(--ink)]">Add the places recruiters can find you.</h3></div><span className="grid h-8 w-8 place-items-center border border-[var(--signal)] text-[var(--signal)]"><Link2 className="h-4 w-4" /></span></div><div className="mt-5 grid gap-3"><div className="flex items-center gap-2"><Linkedin className="h-4 w-4 text-[var(--signal)]" /><Input value={socials.linkedin} onChange={(event) => setSocials((value) => ({ ...value, linkedin: event.target.value }))} placeholder="LinkedIn profile URL" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)]" /></div><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-[var(--signal)]" /><Input value={socials.portfolio} onChange={(event) => setSocials((value) => ({ ...value, portfolio: event.target.value }))} placeholder="Portfolio or personal site URL" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)]" /></div><div className="flex items-center gap-2"><Twitter className="h-4 w-4 text-[var(--signal)]" /><Input value={socials.x} onChange={(event) => setSocials((value) => ({ ...value, x: event.target.value }))} placeholder="X / Twitter profile URL" className="h-10 rounded-none border-[var(--line-strong)] bg-[var(--base)] font-mono text-xs text-[var(--ink)] placeholder:text-[var(--muted-ink)]" /></div></div><p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted-ink)]">Links appear on the card as soon as they are valid.</p></section></div>
          </section>
        </section>
      </main>
      <footer className="relative z-10 border-t border-[var(--line)] bg-[var(--base)] px-5 py-5 md:px-8"><div className="mx-auto flex max-w-[1540px] flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-ink)] sm:flex-row sm:items-center sm:justify-between"><span>DevSignal / An independent identity tool for makers</span><span>Public GitHub data only / No sign-in required</span></div></footer>
    </div>
  );
}
