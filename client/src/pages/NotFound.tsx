import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main className="grid min-h-screen place-items-center bg-[#171b18] p-6 text-[#f4f0e8]">
      <section className="w-full max-w-lg border border-white/15 bg-white/5 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,.28)]">
        <AlertCircle className="mx-auto h-12 w-12 text-[#d97845]" />
        <p className="mt-6 font-mono text-xs uppercase tracking-[.2em] text-[#d97845]">Signal lost / 404</p>
        <h1 className="mt-3 text-3xl font-bold">This page is not part of the studio.</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">Return to DevSignal and turn a public GitHub profile into a shareable developer card.</p>
        <Button onClick={() => setLocation("/")} className="mt-7 rounded-none bg-[#d97845] font-mono text-xs uppercase tracking-[.12em] text-[#171b18] hover:brightness-110">
          <Home className="mr-2 h-4 w-4" /> Return to studio
        </Button>
      </section>
    </main>
  );
}
