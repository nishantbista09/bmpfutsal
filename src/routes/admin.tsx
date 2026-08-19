import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CalendarDays, CheckCircle2, Coins, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney, formatTimeLabel, prettyDate, todayISO } from "@/lib/venue";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — BMP Futsal" },
      {
        name: "description",
        content:
          "Staff dashboard for BMP Futsal: booking requests, payment verification, live notifications and daily revenue.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Dashboard — BMP Futsal" },
      { property: "og:description", content: "Staff-only booking management." },
    ],
  }),
  component: AdminPage,
});

const statusTone: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-secondary text-muted-foreground border-border",
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, courts(name)")
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const row = payload.new as { title: string; body: string };
          toast.success(row.title, { description: row.body });
          void queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const customerMessage = (b: BookingRow, status: string) => {
    const when = `${prettyDate(b.booking_date)}, ${formatTimeLabel(b.start_time)}–${formatTimeLabel(b.end_time)} (${Number(b.hours)} hr)`;
    const session = slotForHour(Number(b.start_time.slice(0, 2)))?.label ?? "";
    if (status === "cancelled") {
      return `Hi ${b.customer_name}, your BMP Futsal booking ${bookingRef(b.id)} for ${when} has been CANCELLED. Please contact us on ${VENUE.phoneLocal} if you need help.`;
    }
    return `Hi ${b.customer_name}, your BMP Futsal booking ${bookingRef(b.id)} is CONFIRMED ✅\n${session} session · ${when}\nTotal: ${formatMoney(Number(b.total_amount))}\nSee you at ${VENUE.address}.`;
  };

  const setStatus = async (
    booking: BookingRow,
    status: string,
    paymentStatus?: string,
  ) => {
    const { error } = await supabase
      .from("bookings")
      .update(paymentStatus ? { status, payment_status: paymentStatus } : { status })
      .eq("id", booking.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Booking ${status}.`);
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

    if (status === "confirmed" || status === "cancelled") {
      const msg = customerMessage(booking, status);
      window.open(waLink(booking.customer_phone, msg), "_blank", "noopener");
    }
  };

  const markAllRead = async () => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-display text-5xl">Staff only</h1>
          <p className="mt-3 text-muted-foreground">
            This dashboard is restricted to BMP Futsal staff accounts.
          </p>
          <Button asChild className="mt-6">
            <Link to={user ? "/" : "/auth"}>{user ? "Back home" : "Sign in"}</Link>
          </Button>
        </main>
      </div>
    );
  }

  const bookings = bookingsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter((n) => !n.is_read).length;
  const today = todayISO();
  const todays = bookings.filter((b) => b.booking_date === today && b.status !== "cancelled");
  const pending = bookings.filter((b) => b.status === "pending");
  const revenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  const filtered =
    tab === "all" ? bookings : bookings.filter((b) => b.status === tab);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-display text-6xl">Admin dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Live booking requests, payment verification and today's schedule.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Bell} label="New alerts" value={String(unread)} />
          <Stat icon={CalendarDays} label="Today's games" value={String(todays.length)} />
          <Stat icon={CheckCircle2} label="Awaiting approval" value={String(pending.length)} />
          <Stat icon={Coins} label="Confirmed revenue" value={formatMoney(revenue)} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="surface-panel p-5">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4 space-y-3">
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nothing here yet.
                  </p>
                )}
                {filtered.map((b) => (
                  <article key={b.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {b.customer_name}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            · {b.customer_phone}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {b.courts?.name} · {prettyDate(b.booking_date)} ·{" "}
                          {formatTimeLabel(b.start_time)} – {formatTimeLabel(b.end_time)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {b.payment_method ?? "—"} · Ref {b.payment_reference ?? "—"} ·{" "}
                          {b.payment_status}
                        </p>
                        {b.notes && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            "{b.notes}"
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={statusTone[b.status] ?? ""}>
                          {b.status}
                        </Badge>
                        <p className="text-display mt-1 text-2xl">
                          {formatMoney(Number(b.total_amount))}
                        </p>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => setStatus(b.id, "confirmed", "paid")}>
                          <CheckCircle2 className="size-4" /> Confirm & mark paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(b.id, "cancelled")}
                        >
                          <XCircle className="size-4" /> Reject
                        </Button>
                      </div>
                    )}
                    {b.status === "confirmed" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(b.id, "completed")}
                        >
                          Mark completed
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
              </TabsContent>
            </Tabs>
          </section>

          <aside className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Notifications</h2>
              {unread > 0 && (
                <Button size="sm" variant="ghost" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 && (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 text-sm ${
                    n.is_read ? "border-border" : "border-primary/40 bg-primary/5"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-GB")}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-panel p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-display text-3xl">{value}</p>
    </div>
  );
}
