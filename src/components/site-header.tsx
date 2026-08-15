import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, ShieldCheck, LogOut, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VENUE } from "@/lib/venue";

const links = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Book a pitch" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-xl">
            B
          </span>
          <span className="text-display text-2xl">{VENUE.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">
                    <ShieldCheck className="size-4" /> Admin
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-bookings">
                  <CalendarDays className="size-4" /> My bookings
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/book">Book now</Link>
          </Button>
        </div>

        <button
          className="rounded-md p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/my-bookings"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  My bookings
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    Admin dashboard
                  </Link>
                )}
                <Button variant="outline" size="sm" className="mt-2" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
            )}
            <Button asChild size="sm" className="mt-2">
              <Link to="/book" onClick={() => setOpen(false)}>
                Book now
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
