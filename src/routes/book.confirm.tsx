import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, Clock, AlertCircle, ShieldCheck } from "lucide-react";
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
  formatHour,
  formatMoney,
  priceForRange,
  slotForHour,
  timeString,
  prettyDate,
} from "@/lib/venue";

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  courtId: z.string().min(1, "Pick a ground"),
  startHour: z.coerce.number().int().min(0).max(23),
  duration: z.coerce.number().int().min(1).max(3),
});

export const Route = createFileRoute("/book/confirm")({
  head: () => ({
    meta: [
      { title: "Confirm Your Booking — BMP Futsal" },
      {
        name: "description",
        content:
          "Review your BMP Futsal booking date, session, hours and final price before completing payment.",
      },
      { property: "og:title", content: "Confirm Your Booking — BMP Futsal" },
      {
        property: "og:description",
        content: "Review your BMP Futsal booking details before payment.",
      },
    ],
  }),
  validateSearch: searchSchema,
  component: ConfirmBookingPage,
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
});

function ConfirmBookingPage() {
  const { date, courtId, startHour, duration } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);


  const { data: court } = useQuery({
    queryKey: ["court", courtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("id", courtId)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: taken, refetch } = useQuery({
    queryKey: ["slots", courtId, date],
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

  const total = priceForRange(startHour, duration);
  const session = slotForHour(startHour);
  const endHour = startHour + duration;

  const isTaken = () => {
    for (const b of taken ?? []) {
      const from = Number(b.start_time.slice(0, 2));
      const to = Number(b.end_time.slice(0, 2));
      if (startHour < to && endHour > from) return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to complete your booking.");
      void navigate({ to: "/auth" });
      return;
    }
    if (!court) {
      toast.error("Selected ground is not available.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const parsed = detailsSchema.safeParse({
      customerName: form.get("customerName"),
      customerPhone: form.get("customerPhone"),
      notes: form.get("notes") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    if (isTaken()) {
      toast.error("Sorry, that slot was just taken. Please pick another time.");
      void refetch();
      return;
    }

    setSubmitting(true);
    const { data: created, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        court_id: court.id,
        booking_date: date,
        start_time: timeString(startHour),
        end_time: timeString(endHour),
        hours: duration,
        total_amount: total,
        customer_name: parsed.data.customerName,
        customer_phone: parsed.data.customerPhone,
        notes: parsed.data.notes ?? null,
        payment_status: "unpaid",
        status: "pending",
      })
      .select("id")
      .single();
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

    void navigate({ to: "/book/payment", search: { bookingId: created.id } });
  };


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-display text-5xl">Confirm your booking</h1>
        <p className="mt-2 text-muted-foreground">
          Review the details below, then complete your payment to lock the slot.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="surface-panel space-y-5 p-6 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              <h2 className="text-xl">Booking summary</h2>
            </div>

            <div className="rounded-lg bg-secondary/60 p-4 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Ground</span>
                <span className="font-medium">{court?.name ?? "—"}</span>
              </p>
              <p className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{prettyDate(date)}</span>
              </p>
              <p className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {formatHour(startHour)} – {formatHour(endHour)}
                </span>
              </p>
              <p className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Session</span>
                <span className="font-medium">{session?.label ?? "—"}</span>
              </p>
              <p className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Total hours</span>
                <span className="font-medium">
                  {duration} hour{duration > 1 ? "s" : ""}
                </span>
              </p>
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {Array.from({ length: duration }).map((_, i) => {
                  const h = startHour + i;
                  const s = slotForHour(h);
                  return (
                    <p key={h} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {formatHour(h)} – {formatHour(h + 1)} · {s?.label}
                      </span>
                      <span>{formatMoney(s?.rate ?? 0)}</span>
                    </p>
                  );
                })}
              </div>
              <p className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold">
                <span>Final price</span>
                <span className="text-primary">{formatMoney(total)}</span>
              </p>
            </div>

            {isTaken() && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  This slot has just been booked by someone else. Please go back and pick another time.
                </p>
              </div>
            )}

            <Button asChild variant="outline" className="w-full">
              <Link to="/book">Change slot</Link>
            </Button>
          </section>

          <section className="surface-panel p-6">
            <div className="mb-5 flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-xl">Payment details</h2>
            </div>

            {!user ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to complete your booking and payment.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Sign in to continue</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full name</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    required
                    maxLength={80}
                    placeholder="Your full name"
                  />
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || isTaken() || !court}
                >
                  {submitting ? "Sending…" : `Continue to payment · ${formatMoney(total)}`}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  You'll pay on the next step with eSewa, Khalti or Fonepay.

                </p>
              </form>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
