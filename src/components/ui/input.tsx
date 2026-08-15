import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950",
        className,
      )}
      {...props}
    />
  );
}
