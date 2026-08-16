import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney, formatTimeLabel, prettyDate } from "@/lib/venue";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Futsal Bookings — BMP Futsal" },
      {
        name: "description",
        content:
          "View, track and cancel your BMP Futsal ground bookings, with payment and confirmation status for each slot.",
      },
      { property: "og:title", content: "My Bookings — BMP Futsal" },
      {
        property: "og:description",
        content: "Track the status of your BMP Futsal bookings.",
      },
    ],
  }),
  component: MyBookings,
});

const statusTone: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-secondary text-muted-foreground border-border",
};

function MyBookings() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

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
      return data;
    },
  });

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking cancelled.");
    void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
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

        {user && bookings?.length === 0 && (
          <div className="surface-panel mt-8 p-8 text-center">
            <p className="text-muted-foreground">No bookings yet.</p>
            <Button asChild className="mt-4">
              <Link to="/book">Book your first slot</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {(bookings ?? []).map((b) => (
            <article key={b.id} className="surface-panel flex flex-wrap gap-4 p-5">
              <div className="min-w-48 flex-1">
                <p className="text-lg font-semibold">{b.courts?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {prettyDate(b.booking_date)} · {formatTimeLabel(b.start_time)} –{" "}
                  {formatTimeLabel(b.end_time)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ref: {b.payment_reference ?? "—"} · {b.payment_method ?? "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={statusTone[b.status] ?? ""}>
                  {b.status}
                </Badge>
                <p className="text-display text-2xl">{formatMoney(Number(b.total_amount))}</p>
                {b.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => cancel(b.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
