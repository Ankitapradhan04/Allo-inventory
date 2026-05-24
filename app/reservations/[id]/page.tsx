import { ReservationPageClient } from "@/components/ReservationPageClient";

export const dynamic = "force-dynamic";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReservationPageClient id={id} />;
}
