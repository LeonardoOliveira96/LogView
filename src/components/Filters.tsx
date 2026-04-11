import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type StatusFilter = "all" | "approved" | "contingency" | "error" | "inutilizada" | "cancelada";

interface FiltersProps {
  statusFilter: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

const statuses: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "approved", label: "Aprovadas" },
  { value: "contingency", label: "Contingência" },
  { value: "inutilizada", label: "Inutilizadas" },
  { value: "cancelada", label: "Canceladas" },
  { value: "error", label: "Erros" },
];

export function Filters({ statusFilter, onStatusChange, search, onSearchChange }: FiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="relative sm:ml-auto sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar nota..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
