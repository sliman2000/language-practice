import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/client/components/ui/empty";

/** What a blank list means and what to do next. */
export function EmptyState({
  title,
  description,
  action,
  testId,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <Empty className="border border-dashed border-border" data-testid={testId}>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
