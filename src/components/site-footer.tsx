import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { VENUE, formatHour } from "@/lib/venue";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-display text-2xl">{VENUE.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{VENUE.tagline}</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Visit us</p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <a href={VENUE.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">
              {VENUE.address}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {formatHour(VENUE.openFrom)} – {formatHour(VENUE.openTo)} daily
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Contact</p>
          <p className="flex items-center gap-2">
            <Phone className="size-4 text-primary" />
            <a href={`tel:${VENUE.phone}`} className="hover:text-foreground">
              {VENUE.phone}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="size-4 text-primary" />
            <a href={`tel:${VENUE.phoneAlt}`} className="hover:text-foreground">
              {VENUE.phoneAlt}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            <a href={`mailto:${VENUE.email}`} className="hover:text-foreground">
              {VENUE.email}
            </a>
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Quick links</p>
          <Link to="/book" className="block hover:text-foreground">
            Book a pitch
          </Link>
          <Link to="/pricing" className="block hover:text-foreground">
            Pricing
          </Link>
          <Link to="/my-bookings" className="block hover:text-foreground">
            My bookings
          </Link>
          <Link to="/contact" className="block hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {VENUE.name}. All rights reserved.
      </div>
    </footer>
  );
}
