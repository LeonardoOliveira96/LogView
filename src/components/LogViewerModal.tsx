import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { X, Search, ChevronUp, ChevronDown, FileText } from "lucide-react";

interface LogViewerModalProps {
    content: string;
    fileName: string;
    onClose: () => void;
}

export function LogViewerModal({ content, fileName, onClose }: LogViewerModalProps) {
    const [search, setSearch] = useState("");
    const [matchIndex, setMatchIndex] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);
    const matchRefs = useRef<(HTMLTableRowElement | null)[]>([]);
    const backdropRef = useRef<HTMLDivElement>(null);

    const lines = useMemo(() => content.split(/\r?\n/), [content]);

    // Build match list: [lineIndex, ...]
    const matches = useMemo<number[]>(() => {
        if (!search.trim()) return [];
        const lower = search.toLowerCase();
        return lines.reduce<number[]>((acc, line, i) => {
            if (line.toLowerCase().includes(lower)) acc.push(i);
            return acc;
        }, []);
    }, [lines, search]);

    const currentMatchLine = matches[matchIndex] ?? -1;

    // Scroll to current match
    useEffect(() => {
        if (currentMatchLine >= 0) {
            const el = matchRefs.current[currentMatchLine];
            el?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, [currentMatchLine]);

    // Reset match index when search changes
    useEffect(() => {
        setMatchIndex(0);
    }, [search]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                e.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.select();
            }
            if (e.key === "Enter" && document.activeElement === searchRef.current) {
                e.preventDefault();
                if (matches.length === 0) return;
                setMatchIndex((prev) =>
                    e.shiftKey ? (prev - 1 + matches.length) % matches.length : (prev + 1) % matches.length
                );
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose, matches]);

    const handleBackdrop = useCallback(
        (e: React.MouseEvent) => { if (e.target === backdropRef.current) onClose(); },
        [onClose]
    );

    const prevMatch = () => setMatchIndex((p) => (p - 1 + matches.length) % matches.length);
    const nextMatch = () => setMatchIndex((p) => (p + 1) % matches.length);

    /** Highlight search term in a line */
    function highlightLine(line: string): React.ReactNode {
        if (!search.trim()) {
            return <span className="text-gray-300">{line || " "}</span>;
        }
        const lower = search.toLowerCase();
        const lowerLine = line.toLowerCase();
        const idx = lowerLine.indexOf(lower);
        if (idx === -1) return <span className="text-gray-300">{line || " "}</span>;

        const parts: React.ReactNode[] = [];
        let cursor = 0;
        let pos = idx;
        while (pos !== -1) {
            if (pos > cursor) parts.push(<span key={cursor} className="text-gray-300">{line.slice(cursor, pos)}</span>);
            parts.push(
                <mark key={pos} className="rounded bg-yellow-400/30 text-yellow-200 px-0">{line.slice(pos, pos + search.length)}</mark>
            );
            cursor = pos + search.length;
            pos = lowerLine.indexOf(lower, cursor);
        }
        if (cursor < line.length) parts.push(<span key={cursor} className="text-gray-300">{line.slice(cursor)}</span>);
        return <>{parts}</>;
    }

    /** Get color class for a log line based on its type tag */
    function lineColor(line: string): string {
        if (/\[ERROR\]/i.test(line)) return "bg-red-950/30";
        if (/\[XML CRIADO\]/i.test(line)) return "bg-blue-950/20";
        if (/\[XML ENVIADO\]/i.test(line)) return "bg-indigo-950/20";
        if (/\[XML CONFIRMADO\]/i.test(line)) return "bg-green-950/20";
        if (/\[XML BACKUP/i.test(line)) return "bg-purple-950/20";
        if (/\[updateDadosNFCe\]/i.test(line)) return "bg-teal-950/20";
        return "";
    }

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-border bg-[#0d1117] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 bg-[#161b22] px-4 py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-semibold text-foreground">{fileName}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{lines.length} linhas</span>
                    </div>

                    {/* Search bar */}
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-black/40 px-2 py-1 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar...  (Ctrl+F)"
                            className="w-52 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"
                        />
                        {search && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {matches.length === 0 ? "0" : `${matchIndex + 1}/${matches.length}`}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevMatch}
                            disabled={matches.length === 0}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            title="Anterior (Shift+Enter)"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                            onClick={nextMatch}
                            disabled={matches.length === 0}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            title="Próximo (Enter)"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Log lines */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full font-mono text-xs">
                        <tbody>
                            {lines.map((line, i) => {
                                const isCurrentMatch = i === currentMatchLine;
                                const isAnyMatch = matches.includes(i) && !isCurrentMatch;
                                const bg = isCurrentMatch
                                    ? "bg-yellow-500/15 outline outline-1 outline-yellow-500/40"
                                    : isAnyMatch
                                        ? "bg-yellow-500/5"
                                        : lineColor(line);

                                return (
                                    <tr
                                        key={i}
                                        ref={(el) => { matchRefs.current[i] = el; }}
                                        className={`group ${bg}`}
                                    >
                                        <td className="w-14 select-none border-r border-border/20 pr-3 pl-2 text-right text-muted-foreground/40 align-top leading-5 py-0.5">
                                            {i + 1}
                                        </td>
                                        <td className="pl-4 pr-4 leading-5 py-0.5 whitespace-pre-wrap break-all">
                                            {highlightLine(line)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 bg-[#161b22] px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500/50 inline-block" />ERROR</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500/50 inline-block" />XML CRIADO</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500/50 inline-block" />XML CONFIRMADO</span>
                    </div>
                    <span>Ctrl+F buscar · Enter próximo · Shift+Enter anterior · ESC fechar</span>
                </div>
            </div>
        </div>
    );
}
