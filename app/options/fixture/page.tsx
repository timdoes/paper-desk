import { OptionsDesk } from "@/components/options/options-desk";
import { loadOpdFixtureSnapshot } from "@/lib/opd-fixture";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function OptionsFixturePage() {
  return <OptionsDesk snapshot={loadOpdFixtureSnapshot()} live={false} />;
}
