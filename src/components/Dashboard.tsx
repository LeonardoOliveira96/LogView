import { FileText, CheckCircle2, AlertTriangle, XCircle, Monitor, Server, Zap } from "lucide-react";
import type { ParsedLog } from "@/lib/logParser";

interface DashboardProps {
  data: ParsedLog;
}

export function Dashboard({ data }: DashboardProps) {
  const notes = Array.from(data.notes.values());
  const approved = notes.filter((n) => n.status === "approved").length;
  const contingency = notes.filter((n) => n.status === "contingency").length;
  const withError = notes.filter((n) => n.status === "error").length;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
      {(data.pdvVersion || data.terminal) && (
        <>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Server className="h-3.5 w-3.5" />
            {data.pdvVersion && <span>v<strong className="text-foreground">{data.pdvVersion}</strong></span>}
            {data.terminal && <span className="text-muted-foreground/60">·</span>}
            {data.terminal && <strong className="text-foreground">{data.terminal}</strong>}
          </span>
          <span className="h-4 w-px bg-border" />
        </>
      )}
      <span className="flex items-center gap-1 text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <strong className="text-foreground">{notes.length}</strong> notas
      </span>
      <span className="flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <strong>{approved}</strong> aprovadas
      </span>
      {contingency > 0 && (
        <span className="flex items-center gap-1 text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          <strong>{contingency}</strong> contingência
        </span>
      )}
      {withError > 0 && (
        <span className="flex items-center gap-1 text-error">
          <XCircle className="h-3.5 w-3.5" />
          <strong>{withError}</strong> com erro
        </span>
      )}
      {data.instabilities.length > 0 && (
        <span className="flex items-center gap-1 text-error">
          <Zap className="h-3.5 w-3.5" />
          <strong>{data.instabilities.length}</strong> instabilidades
        </span>
      )}
      <span className="ml-auto flex items-center gap-1">
        <Monitor className="h-3.5 w-3.5" />
        <span className={data.pdvStatus === "ok" ? "text-success font-semibold" : "text-error font-semibold"}>
          PDV {data.pdvStatus === "ok" ? "OK" : "Erro"}
        </span>
      </span>
    </div>
  );
}
