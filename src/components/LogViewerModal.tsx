import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from "react";
import { X, Search, ChevronUp, ChevronDown, FileText, Filter } from "lucide-react";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("xml", xml);

interface LogViewerModalProps {
    content: string;
    fileName: string;
    onClose: () => void;
}

const LINE_HEIGHT = 24; // pixels
const VISIBLE_LINES = 30; // approximate visible lines

type EventType = "error" | "xml_criado" | "xml_enviado" | "xml_confirmado" | "xml_backup" | "warning" | "info" | "other";

export function LogViewerModal({ content, fileName, onClose }: LogViewerModalProps) {
    const [search, setSearch] = useState("");
    const [matchIndex, setMatchIndex] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [exactMatch, setExactMatch] = useState(false); // Exact word match
    const [showAll, setShowAll] = useState(true); // "TUDO" button state
    const [filters, setFilters] = useState<Record<EventType, boolean>>({
        error: false,
        xml_criado: false,
        xml_enviado: false,
        xml_confirmado: false,
        xml_backup: false,
        warning: false,
        info: false,
        other: false,
    });
    const searchRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const lines = useMemo(() => content.split(/\r?\n/), [content]);

    // Detect event type for a line
    function getEventType(line: unknown): EventType {
        if (typeof line !== "string") return "other";
        if (/\[ERROR\]|\[ERRO\]/i.test(line)) return "error";
        if (/\[XML CRIADO\]/i.test(line)) return "xml_criado";
        if (/\[XML ENVIADO\]/i.test(line)) return "xml_enviado";
        if (/\[XML CONFIRMADO\]/i.test(line)) return "xml_confirmado";
        if (/\[XML BACKUP/i.test(line)) return "xml_backup";
        if (/\[WARNING\]|\[AVISO\]/i.test(line)) return "warning";
        if (/\[INFO\]/i.test(line)) return "info";
        return "other";
    }

    // Filter lines based on active filters
    const filteredLines = useMemo(() => {
        return lines
            .map((line, idx) => ({ line, idx, type: getEventType(line) }))
            .filter(({ type }) => {
                // If "TUDO" (all) is active, show all lines
                if (showAll) return true;
                // Otherwise, show only lines that match active filters
                return filters[type];
            });
    }, [lines, filters, showAll]);

    // Build match list from filtered lines
    const matches = useMemo<number[]>(() => {
        if (!search.trim()) return [];
        const lower = search.toLowerCase();
        
        return filteredLines.reduce<number[]>((acc, { line }, i) => {
            const lineStr = typeof line === "string" ? line : "";
            const lineLower = lineStr.toLowerCase();
            
            if (exactMatch) {
                // Word boundary match - only exact word
                const regex = new RegExp(`\\b${lower}\\b`, "i");
                if (regex.test(lineLower)) acc.push(i);
            } else {
                // Substring match
                if (lineLower.includes(lower)) acc.push(i);
            }
            return acc;
        }, []);
    }, [filteredLines, search, exactMatch]);

    const currentMatchLine = matches[matchIndex] ?? -1;

    // Scroll to current match
    useEffect(() => {
        if (currentMatchLine >= 0 && containerRef.current) {
            const targetScroll = currentMatchLine * LINE_HEIGHT - containerRef.current.clientHeight / 2;
            containerRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
        }
    }, [currentMatchLine]);

    useEffect(() => {
        setMatchIndex(0);
    }, [search]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }
            if (e.key === "Enter" && document.activeElement === searchRef.current) {
                e.preventDefault();
                if (matches.length === 0) return;
                setMatchIndex((prev) =>
                    e.shiftKey ? (prev - 1 + matches.length) % matches.length : (prev + 1) % matches.length
                );
            }
            // Arrow down - next match
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (matches.length === 0) return;
                setMatchIndex((prev) => (prev + 1) % matches.length);
            }
            // Arrow up - previous match
            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (matches.length === 0) return;
                setMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
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

    // Detect if line is XML
    function isXmlLine(line: unknown): boolean {
        if (typeof line !== "string") return false;
        const trimmed = line.trim();
        return trimmed.startsWith("<") && trimmed.includes(">");
    }

    // Format XML with syntax highlighting
    function formatXmlLine(line: unknown): React.ReactNode {
        if (typeof line !== "string") return <span className="text-gray-300">{"[erro ao processar linha]"}</span>;
        try {
            const highlighted = hljs.highlight(line.trim(), { language: "xml" });
            return (
                <code 
                    className="hljs language-xml"
                    dangerouslySetInnerHTML={{ __html: highlighted.value }}
                />
            );
        } catch {
            return <span className="text-gray-300">{line}</span>;
        }
    }

    /** Find all match positions in text (with optional word boundary) */
    function findMatches(text: string, searchTerm: string, useWordBoundary: boolean): number[] {
        const positions: number[] = [];
        const lower = searchTerm.toLowerCase();
        const lowerText = text.toLowerCase();

        if (useWordBoundary) {
            // Check if search term is numeric
            const isNumeric = /^\d+$/.test(searchTerm);
            
            if (isNumeric) {
                // For numbers, use negative lookahead/lookbehind to ensure isolated numbers
                const regex = new RegExp(`(?<!\\d)${lower}(?!\\d)`, "gi");
                let match;
                while ((match = regex.exec(lowerText)) !== null) {
                    positions.push(match.index);
                }
            } else {
                // For text, use standard word boundaries
                const regex = new RegExp(`\\b${lower}\\b`, "gi");
                let match;
                while ((match = regex.exec(lowerText)) !== null) {
                    positions.push(match.index);
                }
            }
        } else {
            // Simple substring matching
            let pos = 0;
            while ((pos = lowerText.indexOf(lower, pos)) !== -1) {
                positions.push(pos);
                pos += lower.length;
            }
        }
        return positions;
    }

    /** Highlight search term in a line */
    function highlightLine(line: unknown): React.ReactNode {
        if (typeof line !== "string") {
            return <span className="text-gray-300">{"[erro ao processar linha]"}</span>;
        }
        
        // For XML lines, format with syntax highlighting first
        if (isXmlLine(line)) {
            if (!search.trim()) {
                return formatXmlLine(line);
            }
            // Still highlight search term in XML
            const formatted = line.trim();
            const positions = findMatches(formatted, search, exactMatch);
            
            if (positions.length === 0) return formatXmlLine(line);

            // For XML, don't try to Apply marks over HTML - just return formatted version
            // The user will see the found matches highlighted in the regular text view
            return formatXmlLine(line);
        }

        if (!search.trim()) {
            return <span className="text-gray-300">{line || " "}</span>;
        }

        const positions = findMatches(line, search, exactMatch);
        if (positions.length === 0) return <span className="text-gray-300">{line}</span>;

        const parts: React.ReactNode[] = [];
        let cursor = 0;
        
        positions.forEach((pos, idx) => {
            if (pos > cursor) parts.push(<span key={`text-${idx}`} className="text-gray-300">{line.slice(cursor, pos)}</span>);
            parts.push(
                <mark key={`mark-${idx}`} className="rounded font-bold text-black bg-yellow-300 px-1">{line.slice(pos, pos + search.length)}</mark>
            );
            cursor = pos + search.length;
        });
        
        if (cursor < line.length) parts.push(<span key="text-end" className="text-gray-300">{line.slice(cursor)}</span>);
        return <>{parts}</>;
    }

    /** Get color class for a log line based on its type tag */
    function lineColor(line: unknown): string {
        if (typeof line !== "string") return "";
        if (/\[ERROR\]/i.test(line)) return "bg-red-900/40 hover:bg-red-900/50";
        if (/\[ERRO\]/i.test(line)) return "bg-red-900/40 hover:bg-red-900/50";
        if (/\[XML CRIADO\]/i.test(line)) return "bg-blue-900/35 hover:bg-blue-900/45";
        if (/\[XML ENVIADO\]/i.test(line)) return "bg-cyan-900/35 hover:bg-cyan-900/45";
        if (/\[XML CONFIRMADO\]/i.test(line)) return "bg-green-900/40 hover:bg-green-900/50";
        if (/\[XML BACKUP/i.test(line)) return "bg-purple-900/35 hover:bg-purple-900/45";
        if (/\[updateDadosNFCe\]/i.test(line)) return "bg-teal-900/35 hover:bg-teal-900/45";
        if (/\[WARNING\]/i.test(line)) return "bg-yellow-900/30 hover:bg-yellow-900/40";
        if (/\[AVISO\]/i.test(line)) return "bg-yellow-900/30 hover:bg-yellow-900/40";
        if (/\[INFO\]/i.test(line)) return "bg-slate-800/20";
        return "";
    }

    // Virtual scroll: calculate visible range
    const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 5);
    const endIdx = Math.min(filteredLines.length, Math.ceil((scrollTop + (containerRef.current?.clientHeight || 800)) / LINE_HEIGHT) + 5);
    const visibleLines = filteredLines.slice(startIdx, endIdx);
    const offsetTop = startIdx * LINE_HEIGHT;

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2"
        >
            <div className="flex h-[96vh] w-[98vw] flex-col rounded-2xl border border-border bg-[#0d1117] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 bg-[#161b22] px-4 py-3 gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-base font-semibold text-foreground">{fileName}</span>
                        <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs text-muted-foreground font-mono">{filteredLines.length}/{lines.length} linhas</span>
                    </div>

                    {/* Search bar */}
                    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/40 px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-48 bg-transparent text-sm text-white placeholder:text-muted-foreground/50 outline-none"
                        />
                        {search && (
                            <span className="shrink-0 text-sm text-muted-foreground font-mono">
                                {matches.length === 0 ? "0" : `${matchIndex + 1}/${matches.length}`}
                            </span>
                        )}
                        <div className="w-px h-5 bg-border/30" />
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={exactMatch}
                                onChange={(e) => setExactMatch(e.target.checked)}
                                className="w-4 h-4 rounded border border-border/50 bg-black/20"
                            />
                            <span className="text-xs text-muted-foreground">Exato</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={prevMatch}
                            disabled={matches.length === 0}
                            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            title="Anterior (Shift+Enter)"
                        >
                            <ChevronUp className="h-5 w-5" />
                        </button>
                        <button
                            onClick={nextMatch}
                            disabled={matches.length === 0}
                            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            title="Próximo (Enter)"
                        >
                            <ChevronDown className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="border-b border-border/50 bg-[#0d1117] px-4 py-2.5 flex items-center gap-3 flex-wrap flex-shrink-0">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    
                    {/* TUDO button */}
                    <button
                        onClick={() => {
                            setShowAll(true);
                            setFilters(f => Object.fromEntries(Object.entries(f).map(([k]) => [k, false])));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            showAll
                                ? "bg-green-500/30 text-green-200 border border-green-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Mostrar tudo"
                    >
                        ● TUDO
                    </button>

                    <div className="w-px h-5 bg-border/50" />

                    <button
                        onClick={() => {
                            setShowAll(false);
                            setFilters(f => ({ ...f, error: !f.error }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            filters.error && !showAll
                                ? "bg-red-500/30 text-red-200 border border-red-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Filtrar ERROR"
                    >
                        ● ERROR
                    </button>
                    <button
                        onClick={() => {
                            setShowAll(false);
                            setFilters(f => ({ ...f, xml_criado: !f.xml_criado }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            filters.xml_criado && !showAll
                                ? "bg-blue-500/30 text-blue-200 border border-blue-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Filtrar XML CRIADO"
                    >
                        ● XML CRIADO
                    </button>
                    <button
                        onClick={() => {
                            setShowAll(false);
                            setFilters(f => ({ ...f, xml_enviado: !f.xml_enviado }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            filters.xml_enviado && !showAll
                                ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Filtrar XML ENVIADO"
                    >
                        ● XML ENVIADO
                    </button>
                    <button
                        onClick={() => {
                            setShowAll(false);
                            setFilters(f => ({ ...f, xml_confirmado: !f.xml_confirmado }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            filters.xml_confirmado && !showAll
                                ? "bg-green-500/30 text-green-200 border border-green-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Filtrar XML CONFIRMADO"
                    >
                        ● XML CONFIRMADO
                    </button>
                    <button
                        onClick={() => {
                            setShowAll(false);
                            setFilters(f => ({ ...f, warning: !f.warning }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            filters.warning && !showAll
                                ? "bg-yellow-500/30 text-yellow-200 border border-yellow-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Filtrar WARNING"
                    >
                        ● WARNING
                    </button>
                    <button
                        onClick={() => {
                            setShowAll(false);
                            setFilters(f => ({ ...f, info: !f.info }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            filters.info && !showAll
                                ? "bg-slate-500/30 text-slate-200 border border-slate-500/50"
                                : "bg-muted/20 text-muted-foreground border border-border/30 opacity-40"
                        }`}
                        title="Filtrar INFO"
                    >
                        ● INFO
                    </button>
                </div>

                {/* Log lines with virtual scrolling */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-[#0d1117]"
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                >
                    <div style={{ height: filteredLines.length * LINE_HEIGHT, position: "relative" }}>
                        <div style={{ transform: `translateY(${offsetTop}px)` }}>
                            {visibleLines.map(({ line, idx }, i) => {
                                // Type guard to ensure line is a string
                                const lineText = typeof line === "string" ? line : "";
                                const isCurrentMatch = i + startIdx === matchIndex;
                                const isAnyMatch = matches.includes(i + startIdx);
                                const bg = isCurrentMatch
                                    ? "bg-orange-600/70 outline outline-2 outline-orange-500"
                                    : isAnyMatch
                                        ? "bg-orange-600/20"
                                        : lineColor(lineText);

                                return (
                                    <div
                                        key={idx}
                                        className={`flex h-6 gap-0 border-b border-border/10 group transition-colors ${bg}`}
                                        style={{ lineHeight: "24px" }}
                                    >
                                        <div className="w-16 select-none flex-shrink-0 border-r border-border/20 pr-2 pl-2 text-right text-muted-foreground/30 text-xs font-mono">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 pl-4 pr-4 text-sm font-mono overflow-hidden text-ellipsis whitespace-pre-wrap break-all">
                                            {highlightLine(lineText)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 bg-[#161b22] px-4 py-2.5 text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />ERROR</span>
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />XML CRIADO</span>
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />XML ENVIADO</span>
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-green-500" />XML CONFIRMADO</span>
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-yellow-500" />WARNING</span>
                    </div>
                    <span className="font-mono">Buscar · ↓↑ navegador · Enter próximo · ESC fechar</span>
                </div>
            </div>
        </div>
    );
}
