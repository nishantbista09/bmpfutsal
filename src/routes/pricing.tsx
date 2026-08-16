import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatHour, VENUE, TIME_SLOTS } from "@/lib/venue";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Futsal Court Pricing & Hourly Rates — BMP Futsal" },
      {
        name: "description",
        content:
          "Transparent hourly rates for every futsal court at BMP Futsal, plus what is included with each booking.",
      },
      { property: "og:title", content: "Futsal Court Pricing — BMP Futsal" },
      {
        property: "og:description",
        content: "Hourly rates for all BMP Futsal courts with no hidden charges.",
      },
    ],
  }),
  component: Pricing,
});

const included = [
  "Match-grade turf and floodlights",
  "Match ball and bibs on request",
  "Changing rooms and drinking water",
  "Free parking for your squad",
  "Digital booking receipt",
];

function Pricing() {
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
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-display text-6xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Three sessions, three simple hourly rates. Booking is open{" "}
          {formatHour(VENUE.openFrom)} – {formatHour(VENUE.openTo)} every day.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TIME_SLOTS.map((slot) => (
            <div key={slot.id} className="surface-panel p-6">
              <h2 className="text-2xl">{slot.label}</h2>
              <p className="mt-1 text-xs uppercase tracking-widest text-primary">{slot.note}</p>
              <p className="text-display mt-4 text-4xl">{formatMoney(slot.rate)}</p>
              <p className="text-sm text-muted-foreground">per hour</p>
              <Button asChild className="mt-5 w-full">
                <Link to="/book">Book this session</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {(courts ?? [])[0]?.name ?? "BMP Futsal Ground"} · same 7-a-side pitch for every
          session.
        </p>

        <div className="surface-panel mt-10 p-6">
          <h2 className="text-2xl">Included with every booking</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
