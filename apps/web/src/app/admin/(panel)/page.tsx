import { AdminTable } from "../../../components/AdminTable";

export default function AdminDashboardPage() {
  return (
    <>
      <h1 style={{ font: "600 24px var(--font-display)", margin: "0 0 18px" }}>Catalog</h1>
      <AdminTable />
    </>
  );
}
