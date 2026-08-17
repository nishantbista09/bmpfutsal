import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  VENUE,
  TIME_SLOTS,
  formatHour,
  formatMoney,
  priceForRange,
  rateForHour,
  slotForHour,
  todayISO,
  prettyDate,
} from "@/lib/venue";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Futsal Slot Online — BMP Futsal" },
      {
        name: "description",
        content:
          "Pick your date and time, see live availability at BMP Futsal and confirm your 7-a-side ground booking online in under a minute.",
      },
      { property: "og:title", content: "Book a Futsal Slot — BMP Futsal" },
      {
        property: "og:description",
        content: "Live availability and online booking for BMP Futsal ground.",
      },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [courtId, setCourtId] = useState<string>("");
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);

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

  useEffect(() => {
    if (!courtId && courts && courts.length > 0) setCourtId(courts[0]!.id);
  }, [courts, courtId]);

  const { data: taken } = useQuery({
    queryKey: ["slots", courtId, date],
    enabled: Boolean(courtId && date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("court_id", courtId)
        .eq("booking_date", date)
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
  });

  const court = courts?.find((c) => c.id === courtId);

  const busyHours = useMemo(() => {
    const set = new Set<number>();
    for (const b of taken ?? []) {
      const from = Number(b.start_time.slice(0, 2));
      const to = Number(b.end_time.slice(0, 2));
      for (let h = from; h < to; h++) set.add(h);
    }
    return set;
  }, [taken]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = VENUE.openFrom; h < VENUE.openTo; h++) list.push(h);
    return list;
  }, []);

  const isPast = (hour: number) => {
    if (date !== todayISO()) return false;
    return hour <= new Date().getHours();
  };

  const canFit = (hour: number, hrs: number) => {
    if (hour + hrs > VENUE.openTo) return false;
    for (let h = hour; h < hour + hrs; h++) {
      if (busyHours.has(h) || isPast(h)) return false;
    }
    return true;
  };

  useEffect(() => {
    if (startHour !== null && !canFit(startHour, duration)) setStartHour(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, date, courtId, taken]);

  const total = startHour === null ? 0 : priceForRange(startHour, duration);

  const handleContinue = () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (startHour === null || !courtId) {
      return;
    }
    void navigate({
      to: "/book/confirm",
      search: {
        date,
        courtId,
        startHour,
        duration,
      },
    });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-display text-6xl">Book your slot</h1>
        <p className="mt-2 text-muted-foreground">
          Live availability for {VENUE.name}. Slots are held only once payment details are
          submitted.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-6">
            {(courts?.length ?? 0) > 1 && (
              <div className="surface-panel p-5">
                <h2 className="text-xl">1. Choose a ground</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(courts ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCourtId(c.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        courtId === c.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.capacity} · {formatMoney(Number(c.price_per_hour))}/hr
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="surface-panel p-5">
              <h2 className="text-xl">
                {(courts?.length ?? 0) > 1 ? "2." : "1."} Pick date & duration
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">
                    <CalendarDays className="mr-1 inline size-4 text-primary" /> Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    min={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Clock className="mr-1 inline size-4 text-primary" /> Duration
                  </Label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDuration(h)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          duration === h
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {h} hr{h > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-panel p-5">
              <h2 className="text-xl">
                {(courts?.length ?? 0) > 1 ? "3." : "2."} Select a start time
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {prettyDate(date)} · greyed-out slots are already booked or in the past.
              </p>
              <div className="mt-5 space-y-5">
                {TIME_SLOTS.map((slot) => {
                  const slotHours = hours.filter((h) => h >= slot.from && h < slot.to);
                  if (slotHours.length === 0) return null;
                  return (
                    <div key={slot.id}>
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-semibold">{slot.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {slot.note} · {formatMoney(slot.rate)}/hr
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slotHours.map((h) => {
                          const available = canFit(h, duration);
                          const selected = startHour === h;
                          return (
                            <button
                              key={h}
                              type="button"
                              disabled={!available}
                              onClick={() => setStartHour(h)}
                              className={`rounded-lg border px-2 py-3 text-sm transition-colors ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : available
                                    ? "border-border hover:bg-secondary"
                                    : "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/50 line-through"
                              }`}
                            >
                              {formatHour(h)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="surface-panel space-y-4 p-5">
              <h2 className="text-xl">Your booking</h2>
              <div className="rounded-lg bg-secondary/60 p-4 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Ground</span>
                  <span>{court?.name ?? "—"}</span>
                </p>
                <p className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{prettyDate(date)}</span>
                </p>
                <p className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>
                    {startHour === null
                      ? "Not selected"
                      : `${formatHour(startHour)} – ${formatHour(startHour + duration)}`}
                  </span>
                </p>
                {startHour !== null && (
                  <p className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">Session</span>
                    <span>
                      {slotForHour(startHour)?.label ?? "—"} · {formatMoney(rateForHour(startHour))}
                      /hr
                    </span>
                  </p>
                )}
                <p className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatMoney(total)}</span>
                </p>
              </div>

              {!user && !loading ? (
                <div className="space-y-3 text-sm">
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                    Sign in to confirm this booking.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/auth">Sign in to continue</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  disabled={startHour === null}
                  onClick={handleContinue}
                >
                  {startHour === null ? "Pick a time slot" : "Review booking"}
                </Button>
              )}
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
