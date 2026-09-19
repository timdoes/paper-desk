import { RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DESK_NAME } from "@/lib/constants";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

export function BrokerErrorDesk({ message }: { message: string }) {
  return (
    <DeskBackdrop>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {DESK_NAME}
          </h1>
          <Badge
            variant="outline"
            className="rounded-full border-amber-300/30 font-mono text-[10px] tracking-[0.18em] text-amber-200 uppercase"
          >
            Broker error
          </Badge>
        </div>
        <GlassPanel>
          <GlassHeader
            title="Alpaca Paper"
            description="The desk will not invent equity, fills, or marks to cover a failed request."
          />
          <GlassBody>
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4">
              <RadioTower className="mt-0.5 size-5 text-amber-200" />
              <div>
                <p className="text-sm font-medium text-amber-50">
                  Alpaca Paper did not return a usable book.
                </p>
                <p className="mt-2 font-mono text-xs leading-6 text-amber-50/80">
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
