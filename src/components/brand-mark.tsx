import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <Disc3 className={cn("size-5", iconClassName)} strokeWidth={2.25} />
    </span>
  );
}
