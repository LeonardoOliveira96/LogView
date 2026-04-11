import type { Note, NoteStatus } from "@/lib/logParser";
import { Badge } from "@/components/ui/badge";

interface NotesTableProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  selectedNote: Note | null;
}

const statusConfig: Record<NoteStatus, { label: string; className: string }> = {
  approved: { label: "Aprovada", className: "bg-success/15 text-success border-success/30" },
  contingency: { label: "Contingência", className: "bg-warning/15 text-warning border-warning/30" },
  error: { label: "Erro", className: "bg-error/15 text-error border-error/30" },
  inutilizada: { label: "Inutilizada", className: "bg-muted/30 text-muted-foreground border-muted" },
};

export function NotesTable({ notes, onSelectNote, selectedNote }: NotesTableProps) {
  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Nenhuma nota encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Nota</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Série</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Status</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Emissão</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Motivo</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Erros</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => {
              const cfg = statusConfig[note.status];
              const isSelected = selectedNote?.number === note.number;
              return (
                <tr
                  key={note.number}
                  onClick={() => onSelectNote(note)}
                  className={`cursor-pointer border-b border-border transition-colors hover:bg-muted/40 ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-foreground">#{note.number}</td>
                  <td className="px-5 py-3 text-muted-foreground">{note.serie || "—"}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={
                      note.emissionType === "9"
                        ? "bg-warning/15 text-warning border-warning/30"
                        : "bg-muted text-muted-foreground border-border"
                    }>
                      {note.emissionType === "9" ? "Offline" : "Normal"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate" title={note.contingencyReason}>
                    {note.contingencyReason || "—"}
                  </td>
                  <td className="px-5 py-3">
                    {note.errors.length > 0 ? (
                      <span className="font-medium text-error">{note.errors.length}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
