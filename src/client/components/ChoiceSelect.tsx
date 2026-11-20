import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

export interface Choice {
  value: string;
  label: string;
}

/** A Select over a fixed list, showing the chosen label. */
export function ChoiceSelect({
  value,
  onChange,
  options,
  placeholder,
  testId,
  id,
  className,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: Choice[];
  placeholder?: string;
  testId?: string;
  id?: string;
  className?: string;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger id={id} data-testid={testId} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
