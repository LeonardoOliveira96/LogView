import { X, Plus } from "lucide-react";

interface LogItem {
    id: string;
    name: string;
}

interface LogSelectorProps {
    logs: LogItem[];
    selectedId: string | null;
    onSelectLog: (id: string) => void;
    onRemoveLog: (id: string) => void;
    onAddLog: () => void;
}

export function LogSelector({
    logs,
    selectedId,
    onSelectLog,
    onRemoveLog,
    onAddLog,
}: LogSelectorProps) {
    if (logs.length === 0) return null;

    return (
        <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Logs carregados:</p>
            <div className="flex flex-wrap gap-2 items-center">
                {logs.map((log) => (
                    <div
                        key={log.id}
                        onClick={() => onSelectLog(log.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all group ${selectedId === log.id
                                ? "border-primary bg-primary/10 text-foreground font-medium"
                                : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                            }`}
                        title={log.name}
                    >
                        <span className="text-sm truncate max-w-[150px]">{log.name}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveLog(log.id);
                            }}
                            className="p-0.5 rounded hover:bg-muted/60 opacity-70 hover:opacity-100 transition-opacity ml-1"
                            title="Remover log"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                <button
                    onClick={onAddLog}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors text-sm font-medium"
                    title="Carregar outro log"
                >
                    <Plus className="h-4 w-4" />
                    Novo
                </button>
            </div>
        </div>
    );
}
