import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (res.ok && data.valid === true) setState({ kind: "valid" });
        else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch {
        setState({ kind: "invalid" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) setState({ kind: "success" });
      else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: data.error ?? "Something went wrong" });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Ontime.Build · Command Center
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wide font-[Barlow_Condensed,Impact,sans-serif]">
            Email Preferences
          </h1>
        </div>

        {state.kind === "loading" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Validating link…
          </div>
        )}

        {state.kind === "valid" && (
          <>
            <p className="text-sm">
              Click below to unsubscribe from app notification emails. You'll
              still receive essential account emails (password resets, security
              alerts).
            </p>
            <Button onClick={confirm} className="w-full">
              Confirm Unsubscribe
            </Button>
          </>
        )}

        {state.kind === "submitting" && (
          <Button disabled className="w-full">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Unsubscribing…
          </Button>
        )}

        {state.kind === "success" && (
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold">You're unsubscribed.</p>
              <p className="text-muted-foreground">
                We won't send you further notification emails.
              </p>
            </div>
          </div>
        )}

        {state.kind === "already" && (
          <div className="flex items-start gap-3 text-sm">
            <MailX className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p>This email is already unsubscribed.</p>
          </div>
        )}

        {state.kind === "invalid" && (
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p>This unsubscribe link is invalid or has expired.</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p>{state.message}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
