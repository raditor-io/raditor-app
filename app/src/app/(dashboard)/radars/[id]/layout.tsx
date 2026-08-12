import { notFound } from "next/navigation";

import { RadarTabNav } from "@/components/radars/radar-tab-nav";
import { BreadcrumbProjectSetter } from "@/components/shared/breadcrumb-context";
import { getRadar, listRadars } from "@/services/radar";

export default async function RadarLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [radar, radars] = await Promise.all([getRadar(id), listRadars()]);
  if (!radar) notFound();

  return (
    <>
      <BreadcrumbProjectSetter
        project={{ id: radar.id, name: radar.name }}
        projects={radars.map((r) => ({ id: r.id, name: r.name }))}
      />
      <RadarTabNav radarId={radar.id} />
      {children}
    </>
  );
}
