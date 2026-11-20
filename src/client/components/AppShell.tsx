import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";

/**
 * The frame every page sits in: a bar with the way back to the Gateway and
 * the theme pick, then one scrolling column. The document itself doesn't
 * scroll (src/client/styles/app.css); the column does. A page starts with a
 * `PageHeader`. An app with more than one page puts its tabs or links in
 * `nav`.
 */
export function AppShell({
  nav,
  children,
}: {
  nav?: ReactNode;
  children: ReactNode;
}) {
  // From the root route's loader (src/serverFunctions/gateway.ts).
  const gatewayUrl = useRouterState({
    select: (state) => {
      const root = state.matches[0]?.loaderData;
      return root && "gatewayUrl" in root ? root.gatewayUrl : null;
    },
  });
  const admin = useRouterState({
    select: (state) => {
      const root = state.matches[0]?.loaderData;
      return Boolean(root && "isAdmin" in root && root.isAdmin);
    },
  });
  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-border">
        <div
          className={`${COLUMN} flex h-12 items-center justify-between gap-3`}
        >
          <div className="flex min-w-0 items-center gap-4">
            {gatewayUrl ? (
              <a
                href={gatewayUrl}
                className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" aria-hidden />
                All apps
              </a>
            ) : null}
          </div>
          <ThemePreferenceRadio />
        </div>
        <nav
          aria-label="Sections"
          className={`${COLUMN} flex h-10 items-center gap-1 overflow-x-auto text-sm`}
        >
          {nav ?? <SectionLinks admin={admin} />}
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className={`${COLUMN} space-y-10 pt-8 pb-24 md:pt-10`}>
          {children}
        </main>
      </div>
    </div>
  );
}

const SECTIONS = [
  { to: "/", label: "Learn" },
  { to: "/courses", label: "Courses" },
  { to: "/review", label: "Review" },
  { to: "/plan", label: "Plan" },
  { to: "/community", label: "Community" },
  { to: "/profile", label: "Profile" },
] as const;

function SectionLinks({ admin }: { admin: boolean }) {
  const linkClass =
    "shrink-0 rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const activeClass = "bg-muted text-foreground";
  return (
    <>
      {SECTIONS.map((section) => (
        <Link
          key={section.to}
          to={section.to}
          activeOptions={{ exact: section.to === "/" }}
          className={linkClass}
          activeProps={{ className: activeClass }}
        >
          {section.label}
        </Link>
      ))}
      {admin ? (
        <Link to="/admin" className={linkClass} activeProps={{ className: activeClass }}>
          Admin
        </Link>
      ) : null}
    </>
  );
}

/** The column the bar and the page share. */
const COLUMN = "mx-auto w-full max-w-3xl px-4 md:px-10";
