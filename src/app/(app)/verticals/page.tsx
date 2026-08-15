import { VerticalsClient } from "@/components/verticals-client";
import { verticalNames } from "@/lib/demo-data";
import { demoMode } from "@/lib/env";
import { listVerticals } from "@/lib/operations-repository";

export default async function VerticalsPage() {
  const verticals = demoMode
    ? verticalNames.map((name) => ({ id: name, name, active: true }))
    : await listVerticals();
  return <VerticalsClient initialVerticals={verticals} demoMode={demoMode} />;
}
