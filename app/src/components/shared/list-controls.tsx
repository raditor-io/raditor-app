"use client";

/**
 * Client controls for the standard list template: selects that navigate by
 * rewriting the list's URL params (filter, items per page).
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function navigateWithParam(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  name: string,
  value: string,
) {
  const next = new URLSearchParams(searchParams);
  if (value) next.set(name, value);
  else next.delete(name);
  next.delete("page"); // changing filters/page size restarts at page 1
  const qs = next.toString();
  router.push(qs ? `${pathname}?${qs}` : pathname);
}

export function ListParamSelect({
  name,
  value,
  options,
  ariaLabel,
  className,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) =>
        navigateWithParam(
          router,
          pathname,
          new URLSearchParams(searchParams),
          name,
          e.target.value,
        )
      }
      className={
        className ??
        "cursor-pointer rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-muted focus:border-accent focus:outline-none"
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
