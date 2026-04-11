import { useState, useMemo, useCallback, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { NotesTable } from "@/components/NotesTable";
import { NoteDetail } from "@/components/NoteDetail";
import { ErrorList } from "@/components/ErrorList";
import { InstabilityList } from "@/components/InstabilityList";
import { Filters, type StatusFilter } from "@/components/Filters";
import { LogViewerModal } from "@/components/LogViewerModal";
import { parseLog, type ParsedLog, type Note } from "@/lib/logParser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText } from "lucide-react";

const Index = () => {
  const [data, setData] = useState<ParsedLog | null>(null);
  const [fileName, setFileName] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showLogViewer, setShowLogViewer] = useState(false);

  const handleFileLoaded = useCallback((content: string, name: string) => {
    const parsed = parseLog(content);
    setData(parsed);
    setFileName(name);
    setSelectedNote(null);
    setStatusFilter("all");
    setSearch("");
  }, []);

  const filteredNotes = useMemo(() => {
    if (!data) return [];
    let notes = Array.from(data.notes.values());
    if (statusFilter !== "all") {
      notes = notes.filter((n) => n.status === statusFilter);
    }
    if (search.trim()) {
      notes = notes.filter((n) => n.number.includes(search.trim()));
    }
    return notes;
  }, [data, statusFilter, search]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo" className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Log View</h1>
            {fileName && (
              <p className="text-xs text-muted-foreground">{fileName}</p>
            )}
          </div>
          {data && (
            <button
              onClick={() => setShowLogViewer(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Abrir log completo"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Ver Log
            </button>
          )}
          {data && (
            <FileUpload onFileLoaded={handleFileLoaded} compact />
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {!data ? (
          <div className="mx-auto max-w-xl pt-20">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                Analise seus logs de PDV
              </h2>
              <p className="mt-2 text-muted-foreground">
                Faça upload de um arquivo <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">.gat</code> para
                visualizar notas fiscais, erros e status do PDV.
              </p>
            </div>
            <FileUpload onFileLoaded={handleFileLoaded} />
          </div>
        ) : (
          <>
            <Dashboard data={data} />

            <Tabs defaultValue="notes" className="space-y-4">
              <TabsList>
                <TabsTrigger value="notes">Notas Fiscais</TabsTrigger>
                <TabsTrigger value="errors">
                  Erros ({data.errors.length})
                </TabsTrigger>
                <TabsTrigger value="instabilities">
                  Instabilidades ({data.instabilities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="space-y-4">
                <Filters
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  search={search}
                  onSearchChange={setSearch}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <NotesTable
                    notes={filteredNotes}
                    onSelectNote={setSelectedNote}
                    selectedNote={selectedNote}
                  />
                  {selectedNote && (
                    <NoteDetail
                      note={selectedNote}
                      onClose={() => setSelectedNote(null)}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="errors">
                <ErrorList errors={data.errors} />
              </TabsContent>

              <TabsContent value="instabilities">
                <InstabilityList instabilities={data.instabilities} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {showLogViewer && data && (
        <LogViewerModal
          content={data.rawContent}
          fileName={fileName}
          onClose={() => setShowLogViewer(false)}
        />
      )}
    </div>
  );
};

export default Index;
