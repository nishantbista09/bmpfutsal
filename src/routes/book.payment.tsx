import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PAYMENT_METHODS,
  VENUE,
  bookingRef,
  formatMoney,
  formatTimeLabel,
  prettyDate,
  slotForHour,
  waLink,
} from "@/lib/venue";

const searchSchema = z.object({
  bookingId: z.string().uuid(),
});

export const Route = createFileRoute("/book/payment")({
  head: () => ({
    meta: [
      { title: "Pay for Your Booking — BMP Futsal" },
      {
        name: "description",
        content:
          "Complete your BMP Futsal payment securely with eSewa, Khalti or Fonepay and lock in your ground slot.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Pay for Your Booking — BMP Futsal" },
      {
        property: "og:description",
        content: "Complete payment to confirm your BMP Futsal slot.",
      },
    ],
  }),
  validateSearch: searchSchema,
  component: PaymentPage,
});

function PaymentPage() {
  const { bookingId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("esewa");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, courts(name)")
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const startHour = booking ? Number(booking.start_time.slice(0, 2)) : 0;
  const session = slotForHour(startHour);

  const finish = async (outcome: "success" | "failed") => {
    setProcessing(true);
    const { error } = await supabase
      .from("bookings")
      .update(
        outcome === "success"
          ? {
              payment_method: method,
              payment_reference: reference.trim(),
              payment_status: "awaiting_verification",
            }
          : { payment_method: method, payment_status: "failed" },
      )
      .eq("id", bookingId);
    setProcessing(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/my-bookings", search: { payment: outcome } });
  };

  const handlePay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (reference.trim().length < 4) {
      toast.error("Enter the transaction / reference code from your payment app.");
      return;
    }
    await finish("success");
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-display text-5xl">Payment</h1>
        <p className="mt-2 text-muted-foreground">
          Send the amount using your preferred wallet, then enter the transaction code to
          complete the booking.
        </p>

        {!user && !loading && (
          <div className="surface-panel mt-8 p-8 text-center">
            <p className="text-muted-foreground">Sign in to pay for this booking.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        )}

        {user && isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}

        {booking && (
          <div className="mt-8 space-y-6">
            <section className="surface-panel space-y-3 p-6 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Booking reference</span>
                <span className="font-mono font-semibold text-primary">
                  {bookingRef(booking.id)}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Ground</span>
                <span className="font-medium">{booking.courts?.name ?? "—"}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{prettyDate(booking.booking_date)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {formatTimeLabel(booking.start_time)} – {formatTimeLabel(booking.end_time)}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Session</span>
                <span className="font-medium">{session?.label ?? "—"}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Total hours</span>
                <span className="font-medium">{Number(booking.hours)}</span>
              </p>
              <p className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <span>Amount to pay</span>
                <span className="text-primary">{formatMoney(Number(booking.total_amount))}</span>
              </p>
            </section>

            <form className="surface-panel space-y-5 p-6" onSubmit={handlePay}>
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h2 className="text-xl">Choose payment method</h2>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="reference">Transaction / reference code</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. ESW-8842193"
                />
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Processing…
                  </>
                ) : (
                  `I have paid ${formatMoney(Number(booking.total_amount))}`
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={processing}
                onClick={() => void finish("failed")}
              >
                Payment failed / cancel
              </Button>
              <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Your slot is held while we verify the payment.
              </p>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
