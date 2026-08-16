import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  VENUE,
  PAYMENT_METHODS,
  TIME_SLOTS,
  formatHour,
  formatMoney,
  priceForRange,
  rateForHour,
  slotForHour,
  timeString,
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

const detailsSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your name").max(80),
  customerPhone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Phone can only contain numbers"),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["esewa", "khalti", "bank"]),
  paymentReference: z
    .string()
    .trim()
    .min(4, "Enter the transaction / reference code")
    .max(60),
});

function BookPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [courtId, setCourtId] = useState<string>("");
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("esewa");
  const [submitting, setSubmitting] = useState(false);

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

  const { data: taken, refetch } = useQuery({
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to complete your booking.");
      void navigate({ to: "/auth" });
      return;
    }
    if (startHour === null || !court) {
      toast.error("Pick a time slot first.");
      return;
    }
    const form = new FormData(e.currentTarget);
    const parsed = detailsSchema.safeParse({
      customerName: form.get("customerName"),
      customerPhone: form.get("customerPhone"),
      notes: form.get("notes") || undefined,
      paymentMethod: method,
      paymentReference: form.get("paymentReference"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      court_id: court.id,
      booking_date: date,
      start_time: timeString(startHour),
      end_time: timeString(startHour + duration),
      hours: duration,
      total_amount: total,
      customer_name: parsed.data.customerName,
      customer_phone: parsed.data.customerPhone,
      notes: parsed.data.notes ?? null,
      payment_method: parsed.data.paymentMethod,
      payment_reference: parsed.data.paymentReference,
      payment_status: "awaiting_verification",
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      if (error.message.includes("bookings_no_overlap")) {
        toast.error("Sorry, that slot was just taken. Please pick another time.");
        void refetch();
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success("Booking sent! We'll confirm your payment shortly.");
    void navigate({ to: "/my-bookings" });
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
            <form className="surface-panel space-y-4 p-5" onSubmit={handleSubmit}>
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
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Full name</Label>
                    <Input id="customerName" name="customerName" required maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      required
                      maxLength={20}
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" name="notes" maxLength={500} rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label>Pay online</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                            method === m.id
                              ? "border-primary bg-primary/10"
                              : "border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHODS.find((m) => m.id === method)?.hint}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Transaction / reference code</Label>
                    <Input
                      id="paymentReference"
                      name="paymentReference"
                      required
                      maxLength={60}
                      placeholder="e.g. ESW-8842193"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting || startHour === null}
                  >
                    {submitting ? "Sending…" : `Confirm booking · ${formatMoney(total)}`}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    We verify your payment and confirm the slot — usually within minutes.
                  </p>
                </>
              )}
            </form>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
