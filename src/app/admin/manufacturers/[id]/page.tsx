import { ManufacturerAdminEditor } from "@/components/admin/manufacturer-admin-editor";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminManufacturerPage({ params }: PageProps) {
  const { id } = await params;
  return <ManufacturerAdminEditor manufacturerId={id} />;
}
