// Shows the result of an admin action. Actions redirect with ?notice=<code>
// or ?error=<code>; only known codes produce a (fixed) message.
import { messageFor } from "@/lib/admin-orgs";

type Params = Record<string, string | string[] | undefined>;

export function Flash({ params }: { params: Params }) {
  const notice = messageFor("notice", params.notice);
  const error = messageFor("error", params.error);
  if (!notice && !error) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm ${
        error ? "border-red-400/40 bg-red-500/10" : "border-emerald-400/40 bg-emerald-500/10"
      }`}
    >
      {error ?? notice}
    </p>
  );
}
