CREATE OR REPLACE FUNCTION public.notify_admin_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  court_name text;
  session_label text;
  start_hour int;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT name INTO court_name FROM public.courts WHERE id = NEW.court_id;
  start_hour := EXTRACT(HOUR FROM NEW.start_time);
  session_label := CASE
    WHEN start_hour < 12 THEN 'Morning'
    WHEN start_hour < 17 THEN 'Afternoon'
    ELSE 'Evening'
  END;

  INSERT INTO public.admin_notifications (booking_id, title, body)
  VALUES (
    NEW.id,
    CASE WHEN NEW.status = 'confirmed' THEN 'Booking confirmed' ELSE 'Booking cancelled' END,
    format('%s — %s session on %s, %s to %s (%s hour(s)) at %s. Total Rs. %s. Payment: %s.',
      NEW.customer_name, session_label, NEW.booking_date, NEW.start_time, NEW.end_time,
      NEW.hours, coalesce(court_name, 'the ground'), NEW.total_amount, NEW.payment_status)
  );
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.notify_admin_booking_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_status_notify ON public.bookings;
CREATE TRIGGER bookings_status_notify
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_booking_status();