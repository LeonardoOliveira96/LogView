import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Code2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { formatXml } from "@/lib/logParser";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("xml", xml);

interface XmlViewerModalProps {
    xml: string;
    title: string;
    onClose: () => void;
}

export function XmlViewerModal({ xml: xmlProp, title, onClose }: XmlViewerModalProps) {
    const [copied, setCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const backdropRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLElement>(null);

    const formatted = formatXml(xmlProp);
    let highlighted = hljs.highlight(formatted, { language: "xml" });

    // Find all matches
    const matchCount = searchTerm.trim()
        ? (formatted.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length
        : 0;

    // Apply search highlighting with different styles for current match
    if (searchTerm.trim()) {
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escapedSearch})`, "gi");
        let matchIndex = 0;

        highlighted.value = highlighted.value.replace(
            regex,
            (match) => {
                const isCurrent = matchIndex === currentMatchIndex;
                const style = isCurrent
                    ? 'background-color: rgba(255, 193, 7, 0.7); color: #000; font-weight: bold; border-radius: 2px;'
                    : 'background-color: rgba(255, 193, 7, 0.2); color: #ffc107; font-weight: normal;';
                matchIndex++;
                return `<mark style="${style}">${match}</mark>`;
            }
        );
    }

    const goToNextMatch = () => {
        if (matchCount > 0) {
            setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
        }
    };

    const goToPrevMatch = () => {
        if (matchCount > 0) {
            setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
        }
    };

    // Reset index when search term changes
    useEffect(() => {
        setCurrentMatchIndex(0);
    }, [searchTerm]);

    // Scroll to current match
    useEffect(() => {
        if (searchTerm && codeRef.current && matchCount > 0) {
            const marks = codeRef.current.querySelectorAll('mark');
            if (marks[currentMatchIndex]) {
                const mark = marks[currentMatchIndex] as HTMLElement;
                const container = codeRef.current.closest('.overflow-auto') as HTMLElement;

                if (container) {
                    // Calculate position relative to container
                    const markTop = mark.offsetTop;
                    const containerHeight = container.clientHeight;
                    const markHeight = mark.offsetHeight;

                    // Scroll so the match is centered in view
                    const scrollTop = markTop - (containerHeight / 2) + (markHeight / 2);
                    container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
                }
            }
        }
    }, [currentMatchIndex, searchTerm, matchCount]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowUp" && matchCount > 0) {
                e.preventDefault();
                goToPrevMatch();
            }
            if (e.key === "ArrowDown" && matchCount > 0) {
                e.preventDefault();
                goToNextMatch();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose, matchCount]);

    const handleCopy = () => {
        navigator.clipboard.writeText(formatted).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) onClose();
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="border-b border-gray-700 bg-gray-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Code2 className="h-5 w-5 text-gray-400" />
                            <span className="text-base font-semibold text-gray-100">{title}</span>
                            <span className="rounded px-2 py-1 text-xs text-gray-400 font-mono bg-gray-700/50">XML</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Search bar compacta */}
                            <div className="flex items-center gap-1.5 bg-gray-700/50 rounded px-2 py-1.5 border border-gray-600">
                                <Search className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-32 bg-transparent text-xs text-gray-100 placeholder-gray-600 outline-none"
                                />
                            </div>

                            {/* Navigation buttons */}
                            {searchTerm && matchCount > 0 && (
                                <>
                                    <button
                                        onClick={goToPrevMatch}
                                        className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded transition-all"
                                        title="Anterior (↑)"
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <span className="text-xs text-gray-500 px-1">
                                        {currentMatchIndex + 1}/{matchCount}
                                    </span>
                                    <button
                                        onClick={goToNextMatch}
                                        className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded transition-all"
                                        title="Próximo (↓)"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                            {searchTerm && matchCount === 0 && (
                                <span className="text-xs text-gray-600 px-2">
                                    —
                                </span>
                            )}

                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-gray-100"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        Copiado!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        Copiar
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center text-gray-400 transition-all hover:bg-gray-700 hover:text-gray-100 rounded"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Code area */}
                <div className="flex-1 overflow-auto bg-gray-950">
                    <pre className="font-mono text-sm p-4 m-0 leading-relaxed text-gray-300">
                        <code
                            ref={codeRef}
                            className="hljs language-xml"
                            dangerouslySetInnerHTML={{ __html: highlighted.value }}
                        />
                    </pre>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-500">
                    <span>{formatted.split("\n").length} linhas</span>
                    <span>ESC para fechar</span>
                </div>
            </div>
        </div>
    );
}
