// App-wide config knobs.

/** Only email addresses on this domain may sign up. Also enforced server-side
    by a trigger on auth.users (see supabase/restrict-domain.sql). */
export const ALLOWED_EMAIL_DOMAIN = "concentrix.com";
