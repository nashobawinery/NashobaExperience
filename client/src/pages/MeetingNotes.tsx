import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mic,
  Square,
  FileText,
  Sparkles,
  Trash2,
  Plus,
  Clock,
  Calendar,
  ChevronLeft,
  Loader2,
  ArrowLeft,
  Users,
  ListChecks,
  CircleDot,
} from "lucide-react";
import type { MeetingNote } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

type ViewMode = "list" | "detail" | "new";

export default function MeetingNotesPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [newNote, setNewNote] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    attendees: "",
    transcript: "",
  });

  const { data: notes = [], isLoading } = useQuery<MeetingNote[]>({
    queryKey: ["/api/meeting-notes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/meeting-notes", data);
      return res.json();
    },
    onSuccess: (note: MeetingNote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      toast({ title: "Meeting note saved" });
      setSelectedNote(note);
      setViewMode("detail");
      resetNewForm();
    },
    onError: () => toast({ title: "Failed to save meeting note", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/meeting-notes/${id}`, data);
      return res.json();
    },
    onSuccess: (note: MeetingNote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      setSelectedNote(note);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meeting-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      toast({ title: "Meeting note deleted" });
      setViewMode("list");
      setSelectedNote(null);
      setDeleteDialogOpen(false);
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/meeting-notes/${id}/summarize`);
      return res.json();
    },
    onSuccess: (note: MeetingNote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-notes"] });
      setSelectedNote(note);
      toast({ title: "Summary generated" });
    },
    onError: () => toast({ title: "Failed to generate summary", variant: "destructive" }),
  });

  const resetNewForm = () => {
    setNewNote({
      title: "",
      date: new Date().toISOString().split("T")[0],
      attendees: "",
      transcript: "",
    });
    setRecordingTime(0);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({ title: "Could not access microphone. Please allow microphone access.", variant: "destructive" });
    }
  }, [toast]);

  const stopRecording = useCallback(async () => {
    return new Promise<Blob>((resolve) => {
      if (!mediaRecorderRef.current) return;

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    });
  }, []);

  const handleStopAndTranscribe = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob || blob.size === 0) return;

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/meeting-notes/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();

      setNewNote(prev => ({
        ...prev,
        transcript: prev.transcript
          ? prev.transcript + "\n\n" + data.transcript
          : data.transcript,
        duration: recordingTime,
      }));

      toast({ title: "Recording transcribed" });
    } catch (err) {
      toast({ title: "Failed to transcribe recording", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  }, [stopRecording, recordingTime, toast]);

  const handleSave = () => {
    if (!newNote.title.trim()) {
      toast({ title: "Please enter a meeting title", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: newNote.title,
      date: newNote.date,
      attendees: newNote.attendees || null,
      transcript: newNote.transcript || null,
      duration: recordingTime || null,
      status: newNote.transcript ? "transcribed" : "draft",
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "summarized": return "default";
      case "transcribed": return "secondary";
      default: return "outline";
    }
  };

  if (viewMode === "new") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setViewMode("list"); resetNewForm(); }} data-testid="button-back-to-list">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-semibold">New Meeting Note</h1>
          </div>

          <Card className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting Title</Label>
                <Input
                  value={newNote.title}
                  onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="e.g. Weekly Team Standup"
                  data-testid="input-meeting-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newNote.date}
                  onChange={e => setNewNote({ ...newNote, date: e.target.value })}
                  data-testid="input-meeting-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attendees</Label>
              <Input
                value={newNote.attendees}
                onChange={e => setNewNote({ ...newNote, attendees: e.target.value })}
                placeholder="e.g. John, Sarah, Mike"
                data-testid="input-meeting-attendees"
              />
            </div>

            <div className="space-y-3">
              <Label>Record Meeting</Label>
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <Button onClick={startRecording} disabled={isTranscribing} data-testid="button-start-recording">
                    <Mic className="h-4 w-4 mr-2" /> Start Recording
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleStopAndTranscribe} data-testid="button-stop-recording">
                    <Square className="h-4 w-4 mr-2" /> Stop Recording
                  </Button>
                )}

                {isRecording && (
                  <div className="flex items-center gap-2" data-testid="recording-indicator">
                    <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
                    <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                  </div>
                )}

                {isTranscribing && (
                  <div className="flex items-center gap-2 text-muted-foreground" data-testid="transcribing-indicator">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Transcribing...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transcript</Label>
              <Textarea
                value={newNote.transcript}
                onChange={e => setNewNote({ ...newNote, transcript: e.target.value })}
                placeholder="Record a meeting above or type/paste notes here..."
                rows={10}
                data-testid="textarea-transcript"
              />
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setViewMode("list"); resetNewForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || !newNote.title.trim()} data-testid="button-save-meeting">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Meeting Note
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "detail" && selectedNote) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} data-testid="button-back-from-detail">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold" data-testid="text-meeting-title">{selectedNote.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {selectedNote.date}</span>
                  {selectedNote.duration && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(selectedNote.duration)}</span>
                  )}
                  <Badge variant={statusColor(selectedNote.status)} data-testid="badge-meeting-status">
                    {selectedNote.status === "summarized" ? "Summarized" : selectedNote.status === "transcribed" ? "Transcribed" : "Draft"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedNote.transcript && (
                <Button
                  onClick={() => summarizeMutation.mutate(selectedNote.id)}
                  disabled={summarizeMutation.isPending}
                  data-testid="button-generate-summary"
                >
                  {summarizeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {selectedNote.summary ? "Regenerate Summary" : "Generate Summary"}
                </Button>
              )}
              <Button
                variant="destructive"
                size="icon"
                onClick={() => { setNoteToDelete(selectedNote.id); setDeleteDialogOpen(true); }}
                data-testid="button-delete-meeting"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedNote.attendees && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Attendees</span>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-attendees">{selectedNote.attendees}</p>
            </Card>
          )}

          {selectedNote.summary && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Summary</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm" data-testid="text-summary">
                {selectedNote.summary.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(2)}</h3>;
                  if (line.startsWith("## ")) return <h4 key={i} className="text-sm font-semibold mt-3 mb-1">{line.slice(3)}</h4>;
                  if (line.startsWith("**") && line.endsWith("**")) return <h4 key={i} className="text-sm font-semibold mt-3 mb-1">{line.slice(2, -2)}</h4>;
                  if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="pl-4 py-0.5 text-muted-foreground">{line}</p>;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i} className="py-0.5">{line}</p>;
                })}
              </div>
            </Card>
          )}

          {selectedNote.actionItems && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Action Items</span>
              </div>
              <div className="text-sm space-y-1" data-testid="text-action-items">
                {selectedNote.actionItems.split("\n").map((line, i) => (
                  <p key={i} className={line.startsWith("- ") ? "pl-2 text-muted-foreground" : ""}>{line}</p>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Transcript</span>
            </div>
            {selectedNote.transcript ? (
              <div className="text-sm whitespace-pre-wrap text-muted-foreground" data-testid="text-transcript">
                {selectedNote.transcript}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No transcript available</p>
            )}
          </Card>
        </div>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Meeting Note</DialogTitle>
              <DialogDescription>Are you sure you want to delete this meeting note? This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => noteToDelete && deleteMutation.mutate(noteToDelete)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-back-hub">
              <ChevronLeft className="h-4 w-4" /> Admin Hub
            </Button>
          </Link>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground">Central operations management and team coordination</p>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Mic className="h-5 w-5 text-muted-foreground" /> Meeting Notes
          </h2>
          <Button onClick={() => setViewMode("new")} data-testid="button-new-meeting">
            <Plus className="h-4 w-4 mr-2" /> New Meeting
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : notes.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">No Meeting Notes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Record your first meeting to get started with AI-powered summaries.</p>
            <Button onClick={() => setViewMode("new")} data-testid="button-new-meeting-empty">
              <Mic className="h-4 w-4 mr-2" /> Record a Meeting
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <Card
                key={note.id}
                className="p-4 cursor-pointer hover-elevate"
                onClick={() => { setSelectedNote(note); setViewMode("detail"); }}
                data-testid={`card-meeting-${note.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{note.title}</h3>
                      <Badge variant={statusColor(note.status)}>
                        {note.status === "summarized" ? "Summarized" : note.status === "transcribed" ? "Transcribed" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {note.date}</span>
                      {note.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(note.duration)}</span>}
                      {note.attendees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {note.attendees}</span>}
                    </div>
                    {note.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{note.summary.slice(0, 150)}...</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
