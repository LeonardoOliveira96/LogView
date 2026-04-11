import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Code2 } from "lucide-react";
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
    const backdropRef = useRef<HTMLDivElement>(null);

    const formatted = formatXml(xmlProp);
    const highlighted = hljs.highlight(formatted, { language: "xml" });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

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
                            className="hljs language-xml"
                            dangerouslySetInnerHTML={{ __html: highlighted.value }}
                        />
                    </pre>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-500">
                    <span>{formatted.split("\n").length} linhas</span>
                    <span>Ctrl+F para pesquisar • ESC para fechar</span>
                </div>
            </div>
        </div>
    );
}
