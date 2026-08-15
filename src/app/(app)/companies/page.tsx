import { CompanyTable } from "@/components/company-table";
import { PageHeading } from "@/components/page-heading";
export default function CompaniesPage() {
  return (
    <>
      <PageHeading
        title="Empresas"
        description="Base de contas pesquisadas, com sinais, evidências e classificações pessoais."
      />
      <CompanyTable />
    </>
  );
}
