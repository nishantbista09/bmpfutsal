import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ShieldCheck, Zap, Trophy, MapPin, Clock } from "lucide-react";
import heroImage from "@/assets/hero-futsal.jpg";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { VENUE, formatHour, formatMoney } from "@/lib/venue";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BMP Futsal — Book Your Futsal Pitch Online in Kathmandu" },
      {
        name: "description",
        content:
          "Book a floodlit futsal court at BMP Futsal in seconds. Live slot availability, instant online payment and confirmed bookings.",
      },
      { property: "og:title", content: "BMP Futsal — Book Your Futsal Pitch Online in Kathmandu" },
      {
        property: "og:description",
        content:
          "Book a floodlit futsal court at BMP Futsal in seconds. Live slot availability, instant online payment and confirmed bookings.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: Zap,
    title: "Real-time availability",
    text: "Every slot you see is live. No double bookings, no phone tag.",
  },
  {
    icon: CalendarCheck,
    title: "Book in 30 seconds",
    text: "Pick a court, pick a time, pay online. Your slot is locked instantly.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & tracked",
    text: "Every booking gets a reference, receipt and status you can follow.",
  },
  {
    icon: Trophy,
    title: "Tournament ready",
    text: "Floodlights, changing rooms and match-grade turf for league nights.",
  },
];

function Home() {
  const { data: courts } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Floodlit indoor futsal court at BMP Futsal"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Lalitpur · Open daily
          </span>
          <h1 className="text-display mt-6 max-w-3xl text-6xl sm:text-8xl">
            Your pitch is <span className="text-primary">one tap</span> away
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            {VENUE.tagline} Check live availability across our courts and confirm your
            slot online — day or night.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/book">Book a pitch</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              {formatHour(VENUE.openFrom)} – {formatHour(VENUE.openTo)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              {VENUE.address}
            </span>
          </div>
        </div>
      </section>

      <section className="pitch-lines border-y border-border">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="surface-panel p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-display text-5xl">Our ground</h2>
        <p className="mt-2 text-muted-foreground">
          A full-size 7-a-side pitch under floodlights, bookable by the hour.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {(courts ?? []).map((court) => (
            <article key={court.id} className="surface-panel flex flex-col p-6">
              <h3 className="text-2xl">{court.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-widest text-primary">
                {court.capacity} · {court.surface}
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{court.description}</p>
              <p className="mt-4 text-display text-3xl">
                {formatMoney(Number(court.price_per_hour))}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ hour</span>
              </p>
              <Button asChild className="mt-4">
                <Link to="/book">Check availability</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-display text-5xl">Find us</h2>
            <p className="mt-3 text-muted-foreground">
              {VENUE.address}. Free parking, changing rooms and a chill-out area for your
              squad.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <a href={VENUE.mapsUrl} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title="BMP Futsal location map"
              src={VENUE.mapsEmbed}
              loading="lazy"
              className="h-72 w-full"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
