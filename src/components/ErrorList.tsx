import type { LogEntry } from "@/lib/logParser";
import { AlertCircle } from "lucide-react";

interface ErrorListProps {
  errors: LogEntry[];
}

export function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Nenhum erro encontrado. 🎉
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.map((err, i) => (
        <div
          key={i}
          className="animate-slide-up flex items-start gap-3 rounded-xl border border-error/20 bg-error/5 p-4"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              {err.date} {err.time} — Linha {err.lineNumber}
            </div>
            <p className="mt-1 text-sm text-foreground break-words">{err.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
