import { AppShell } from "@/client/components/AppShell";
import { PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";

/** What a member who isn't an admin sees on an admin page. */
export function NotAdmin() {
  return (
    <AppShell>
      <PageHeader title="Admin" />
      <EmptyState
        testId="not-admin"
        title="Only admins can edit courses"
        description="Ask an owner or admin of your organization."
      />
    </AppShell>
  );
}
