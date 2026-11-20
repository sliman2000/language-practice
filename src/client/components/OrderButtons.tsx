import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";

/** Move up, move down and delete for one row of an ordered list. */
export function OrderButtons({
  label,
  first,
  last,
  disabled,
  onMove,
  onDelete,
}: {
  label: string;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon-sm" aria-label={`Move ${label} up`} disabled={disabled || first} onClick={() => onMove("up")}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Move ${label} down`} disabled={disabled || last} onClick={() => onMove("down")}>
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${label}`}
        className="text-muted-foreground hover:text-destructive"
        disabled={disabled}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
