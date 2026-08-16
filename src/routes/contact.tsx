import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { VENUE, formatHour } from "@/lib/venue";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Location — BMP Futsal Arena" },
      {
        name: "description",
        content:
          "Call, email or visit BMP Futsal in Lalitpur. Opening hours, directions and the fastest way to reach our team.",
      },
      { property: "og:title", content: "Contact BMP Futsal" },
      {
        property: "og:description",
        content: "Opening hours, phone, email and directions to BMP Futsal Arena.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-display text-6xl">Contact us</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Questions about a booking, tournaments or monthly team slots? Reach out — we
          reply fast.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="surface-panel space-y-5 p-6">
            <div className="flex items-start gap-3">
              <Phone className="mt-1 size-5 text-primary" />
              <div>
                <p className="font-semibold">Phone</p>
                <a href={`tel:${VENUE.phone}`} className="block text-sm text-muted-foreground">
                  {VENUE.phone}
                </a>
                <a href={`tel:${VENUE.phoneAlt}`} className="block text-sm text-muted-foreground">
                  {VENUE.phoneAlt}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-1 size-5 text-primary" />
              <div>
                <p className="font-semibold">Email</p>
                <a href={`mailto:${VENUE.email}`} className="text-sm text-muted-foreground">
                  {VENUE.email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 size-5 text-primary" />
              <div>
                <p className="font-semibold">Address</p>
                <p className="text-sm text-muted-foreground">{VENUE.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-1 size-5 text-primary" />
              <div>
                <p className="font-semibold">Opening hours</p>
                <p className="text-sm text-muted-foreground">
                  {formatHour(VENUE.openFrom)} – {formatHour(VENUE.openTo)}, every day
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <a href={VENUE.mapsUrl} target="_blank" rel="noreferrer">
                Get directions
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title="BMP Futsal location map"
              src={VENUE.mapsEmbed}
              loading="lazy"
              className="h-full min-h-80 w-full"
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
