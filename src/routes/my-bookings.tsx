import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  formatMoney,
  formatTimeLabel,
  prettyDate,
  slotForHour,
  todayISO,
} from "@/lib/venue";

const searchSchema = z.object({
  payment: z.enum(["success", "failed"]).optional(),
});

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Futsal Bookings — BMP Futsal" },
      {
        name: "description",
        content:
          "View upcoming and past BMP Futsal ground bookings, check payment status and cancel a slot you no longer need.",
      },
      { property: "og:title", content: "My Bookings — BMP Futsal" },
      {
        property: "og:description",
        content: "Track upcoming and past BMP Futsal bookings.",
      },
    ],
  }),
  validateSearch: searchSchema,
  component: MyBookings,
});

const statusTone: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-secondary text-muted-foreground border-border",
};

const paymentLabel: Record<string, string> = {
  unpaid: "Payment pending",
  awaiting_verification: "Payment under review",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  total_amount: number;
  courts: { name: string | null; capacity: string | null } | null;
};

function MyBookings() {
  const { user, loading } = useAuth();
  const { payment } = Route.useSearch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (payment === "success") {
      toast.success("Payment submitted! We'll verify and confirm your slot shortly.");
    } else if (payment === "failed") {
      toast.error("Payment was not completed. Your slot is unpaid — you can retry or cancel.");
    }
  }, [payment]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, courts(name, capacity)")
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as unknown as BookingRow[];
    },
  });

  const today = todayISO();
  const all = bookings ?? [];
  const upcoming = all
    .filter((b) => b.booking_date >= today && b.status !== "cancelled")
    .sort((a, b) =>
      a.booking_date === b.booking_date
        ? a.start_time.localeCompare(b.start_time)
        : a.booking_date.localeCompare(b.booking_date),
    );
  const past = all.filter((b) => !upcoming.includes(b));

  const cancel = async (b: BookingRow) => {
    const refundNote =
      b.payment_status === "awaiting_verification" || b.payment_status === "paid"
        ? " Any amount already sent will be refunded after review."
        : "";
    if (!window.confirm(`Cancel this booking of ${formatMoney(Number(b.total_amount))}?${refundNote}`))
      return;

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        payment_status:
          b.payment_status === "awaiting_verification" || b.payment_status === "paid"
            ? "refunded"
            : b.payment_status,
      })
      .eq("id", b.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking cancelled. Staff have been notified.");
    void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const renderCard = (b: BookingRow, canCancel: boolean) => {
    const startHour = Number(b.start_time.slice(0, 2));
    const session = slotForHour(startHour);
    return (
      <article key={b.id} className="surface-panel flex flex-wrap gap-4 p-5">
        <div className="min-w-48 flex-1">
          <p className="text-lg font-semibold">{b.courts?.name ?? "BMP Futsal Ground"}</p>
          <p className="text-sm text-muted-foreground">
            {prettyDate(b.booking_date)} · {formatTimeLabel(b.start_time)} –{" "}
            {formatTimeLabel(b.end_time)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session?.label ?? "—"} session · {Number(b.hours)} hour
            {Number(b.hours) > 1 ? "s" : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-primary">{bookingRef(b.id)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Txn: {b.payment_reference ?? "—"} · {b.payment_method ?? "—"}
          </p>
          <a
            className="mt-2 inline-block rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
            href={waLink(
              VENUE.whatsapp,
              `Hi BMP Futsal, about my booking ${bookingRef(b.id)} on ${prettyDate(b.booking_date)} at ${formatTimeLabel(b.start_time)}.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp us
          </a>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Badge variant="outline" className={statusTone[b.status] ?? ""}>
              {b.status}
            </Badge>
            <Badge variant="outline">
              {paymentLabel[b.payment_status] ?? b.payment_status}
            </Badge>
          </div>
          <p className="text-display text-2xl">
            {b.status === "cancelled" ? (
              <span className="text-muted-foreground line-through">
                {formatMoney(Number(b.total_amount))}
              </span>
            ) : (
              formatMoney(Number(b.total_amount))
            )}
          </p>
          <div className="flex gap-2">
            {b.status === "pending" &&
              (b.payment_status === "unpaid" || b.payment_status === "failed") && (
                <Button asChild size="sm">
                  <Link to="/book/payment" search={{ bookingId: b.id }}>
                    Pay now
                  </Link>
                </Button>
              )}
            {canCancel && b.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => void cancel(b)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-display text-6xl">My bookings</h1>

        {!user && !loading && (
          <div className="surface-panel mt-8 p-8 text-center">
            <p className="text-muted-foreground">Sign in to see your bookings.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        )}

        {user && isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}

        {user && !isLoading && (
          <Tabs defaultValue="upcoming" className="mt-8">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="history">History ({past.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6 space-y-4">
              {upcoming.length === 0 ? (
                <div className="surface-panel p-8 text-center">
                  <p className="text-muted-foreground">No upcoming bookings.</p>
                  <Button asChild className="mt-4">
                    <Link to="/book">Book a slot</Link>
                  </Button>
                </div>
              ) : (
                upcoming.map((b) => renderCard(b, true))
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-4">
              {past.length === 0 ? (
                <p className="text-muted-foreground">Nothing here yet.</p>
              ) : (
                past.map((b) => renderCard(b, false))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
