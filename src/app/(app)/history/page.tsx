import { PageHeading } from "@/components/page-heading";
import { ResearchRunList } from "@/components/research-run-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function HistoryPage() {
  return (
    <>
      <PageHeading
        title="Histórico"
        description="Execuções, decisões e auditoria em uma linha do tempo única."
      />
      <Card>
        <CardHeader>
          <CardTitle>Execuções recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResearchRunList limit={30} />
        </CardContent>
      </Card>
    </>
  );
}
