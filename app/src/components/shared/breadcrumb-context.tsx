"use client";

/**
 * Client context carrying the active project (and the switcher list) from the
 * project layout up into the top-bar breadcrumbs — the dodi "leaf override"
 * store pattern, done with React context. The setter runs in an effect, so
 * the org-only crumb renders for one frame before the project crumb appears.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface BreadcrumbProject {
  id: string;
  name: string;
}

interface BreadcrumbContextValue {
  project: BreadcrumbProject | null;
  projects: BreadcrumbProject[];
  setProjectContext: (
    project: BreadcrumbProject | null,
    projects: BreadcrumbProject[],
  ) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  project: null,
  projects: [],
  setProjectContext: () => {},
});

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [project, setProject] = useState<BreadcrumbProject | null>(null);
  const [projects, setProjects] = useState<BreadcrumbProject[]>([]);

  // Stable identity: consumers put this in effect deps.
  const setProjectContext = useCallback(
    (nextProject: BreadcrumbProject | null, nextProjects: BreadcrumbProject[]) => {
      setProject(nextProject);
      setProjects(nextProjects);
    },
    [],
  );

  const value = useMemo<BreadcrumbContextValue>(
    () => ({ project, projects, setProjectContext }),
    [project, projects, setProjectContext],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
  return useContext(BreadcrumbContext);
}

/** Rendered by the project layout to publish the active project. */
export function BreadcrumbProjectSetter({
  project,
  projects,
}: {
  project: BreadcrumbProject;
  projects: BreadcrumbProject[];
}) {
  const { setProjectContext } = useBreadcrumbContext();
  // Serialized deps: props are fresh object identities on every render.
  const projectKey = JSON.stringify(project);
  const projectsKey = JSON.stringify(projects);
  useEffect(() => {
    setProjectContext(
      JSON.parse(projectKey) as BreadcrumbProject,
      JSON.parse(projectsKey) as BreadcrumbProject[],
    );
    return () => setProjectContext(null, []);
  }, [projectKey, projectsKey, setProjectContext]);
  return null;
}
