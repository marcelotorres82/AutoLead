import { VerticalsClient } from "@/components/verticals-client";
import { verticalNames, verticalTaxonomy } from "@/lib/domain";
import { demoMode } from "@/lib/env";
import { listVerticals } from "@/lib/operations-repository";

export default async function VerticalsPage() {
  const verticals = demoMode
    ? verticalNames.map((name) => ({
        id: name,
        name,
        active: true,
        subverticals: verticalTaxonomy[name],
      }))
    : await listVerticals();
  return <VerticalsClient initialVerticals={verticals} demoMode={demoMode} />;
}
