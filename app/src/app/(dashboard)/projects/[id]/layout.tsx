import { notFound } from "next/navigation";

import { BreadcrumbProjectSetter } from "@/components/shared/breadcrumb-context";
import { getProject, listProjects } from "@/services/project";

export default async function ProjectLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const [project, projects] = await Promise.all([getProject(id), listProjects()]);
  if (!project) {
    notFound();
  }

  return (
    <>
      <BreadcrumbProjectSetter
        project={{ id: project.id, name: project.display_name }}
        projects={projects.map((p) => ({ id: p.id, name: p.display_name }))}
      />
      {children}
    </>
  );
}
