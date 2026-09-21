import { ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DESK_NAME } from "@/lib/constants";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

export function PaperGuardDesk({ message }: { message: string }) {
  return (
    <DeskBackdrop>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {DESK_NAME}
          </h1>
          <Badge
            variant="destructive"
            className="rounded-full font-mono text-[10px] tracking-[0.18em] uppercase"
          >
            Guard tripped
          </Badge>
        </div>
        <GlassPanel className="shadow-[0_0_80px_-20px_rgba(251,113,133,0.45)]">
          <GlassHeader
            title="Paper guard"
            description="Live Alpaca is refused. No request was sent to api.alpaca.markets."
          />
          <GlassBody>
            <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/8 p-4">
              <ShieldX className="mt-0.5 size-5 text-rose-300" />
              <div>
                <p className="text-sm font-medium text-rose-100">
                  Paper Desk hard-failed before talking to a broker.
                </p>
                <p className="mt-2 font-mono text-xs leading-6 text-rose-100/80">
                  {message}
                </p>
              </div>
            </div>
          </GlassBody>
        </GlassPanel>
      </div>
    </DeskBackdrop>
  );
}
