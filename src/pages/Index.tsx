import { useState, useMemo, useCallback, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { NotesTable } from "@/components/NotesTable";
import { NoteDetail } from "@/components/NoteDetail";
import { ErrorList } from "@/components/ErrorList";
import { InstabilityList } from "@/components/InstabilityList";
import { Filters, type StatusFilter } from "@/components/Filters";
import { LogViewerModal } from "@/components/LogViewerModal";
import { LogSelector } from "@/components/LogSelector";
import { parseLog, type ParsedLog, type Note } from "@/lib/logParser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText } from "lucide-react";

const Index = () => {
  const [logsMap, setLogsMap] = useState<Map<string, ParsedLog>>(new Map());
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showLogViewer, setShowLogViewer] = useState(false);

  const currentData = selectedLogId ? logsMap.get(selectedLogId) : null;

  const handleFileLoaded = useCallback((content: string, name: string) => {
    const parsed = parseLog(content);
    const logId = `${name}-${Date.now()}`;

    setLogsMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(logId, parsed);
      return newMap;
    });

    setSelectedLogId(logId);
    setSelectedNote(null);
    setStatusFilter("all");
    setSearch("");
  }, []);

  const handleRemoveLog = useCallback((logId: string) => {
    setLogsMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(logId);
      return newMap;
    });

    if (selectedLogId === logId) {
      const remainingLogs = Array.from(logsMap.keys()).filter((id) => id !== logId);
      setSelectedLogId(remainingLogs[0] || null);
    }
  }, [logsMap, selectedLogId]);

  const handleAddLog = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gat,.log,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          handleFileLoaded(text, file.name);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [handleFileLoaded]);

  const handleNavigateToNote = useCallback(
    (noteNumber: string, filter?: string) => {
      if (!currentData) return;
      const note = currentData.notes.get(noteNumber);
      if (note) {
        setSelectedNote(note);
        if (filter) {
          setStatusFilter(filter as StatusFilter);
        }
        setSearch("");
      }
    },
    [currentData]
  );

  const filteredNotes = useMemo(() => {
    if (!currentData) return [];
    let notes = Array.from(currentData.notes.values());
    if (statusFilter !== "all") {
      notes = notes.filter((n) => n.status === statusFilter);
    }
    if (search.trim()) {
      notes = notes.filter((n) => n.number.includes(search.trim()));
    }
    return notes;
  }, [currentData, statusFilter, search]);

  const logsList = Array.from(logsMap.entries()).map(([id]) => ({
    id,
    name: id.split("-").slice(0, -1).join("-") || id,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo" className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Analisa Log</h1>
          </div>
          {currentData && (
            <button
              onClick={() => setShowLogViewer(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Abrir log completo"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Ver Log
            </button>
          )}
          {logsMap.size > 0 && (
            <FileUpload onFileLoaded={handleFileLoaded} onReset={handleAddLog} compact />
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {logsMap.size === 0 ? (
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
            {currentData && (
              <>
                <Dashboard data={currentData} />

                {logsMap.size > 0 && (
                  <LogSelector
                    logs={logsList}
                    selectedId={selectedLogId}
                    onSelectLog={setSelectedLogId}
                    onRemoveLog={handleRemoveLog}
                    onAddLog={handleAddLog}
                  />
                )}

                <Tabs defaultValue="notes" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="notes">Notas Fiscais</TabsTrigger>
                    <TabsTrigger value="errors">
                      Erros ({currentData.errors.length})
                    </TabsTrigger>
                    <TabsTrigger value="instabilities">
                      Instabilidades ({currentData.instabilities.length})
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
                          onNavigateToNote={handleNavigateToNote}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="errors">
                    <ErrorList errors={currentData.errors} />
                  </TabsContent>

                  <TabsContent value="instabilities">
                    <InstabilityList instabilities={currentData.instabilities} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </main>

      {showLogViewer && currentData && (
        <LogViewerModal
          content={currentData.rawContent}
          fileName={selectedLogId ? selectedLogId.split("-")[0] : "log"}
          onClose={() => setShowLogViewer(false)}
        />
      )}
    </div>
  );
};

export default Index;
