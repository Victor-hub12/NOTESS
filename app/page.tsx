"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { checkNote } from "./actions";

type Note = {
  title: string;
  body: string;
  tags: string[];
};

const NOTES_STORAGE_KEY = "notess-notes";
const NOTES_STORAGE_EVENT = "notess-notes-storage-change";
const STORAGE_LOADING = "__notess_storage_loading__";
const STORAGE_READ_ERROR = "__notess_storage_read_error__";
const SUGGESTED_TAGS = ["work", "church", "personal", "ideas", "reading"];

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold tracking-tight text-[#2e3027]">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold tracking-tight text-[#2e3027]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-[#2e3027]">{children}</h3>
  ),
  p: ({ children }) => <p className="leading-relaxed text-[#45463b]">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[#2e3027]">
      {children}
    </strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-6 marker:text-[#596247]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-6 marker:text-[#596247]">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1 text-[#45463b]">{children}</li>,
};

function subscribeToNotesStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(NOTES_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(NOTES_STORAGE_EVENT, onStoreChange);
  };
}

function getNotesSnapshot() {
  try {
    return window.localStorage.getItem(NOTES_STORAGE_KEY);
  } catch {
    return STORAGE_READ_ERROR;
  }
}

function getServerNotesSnapshot() {
  return STORAGE_LOADING;
}

function saveNotesSnapshot(notes: Note[]) {
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event(NOTES_STORAGE_EVENT));
}

function isNoteList(value: unknown): value is Note[] {
  return (
    Array.isArray(value) &&
    value.every(
      (note) =>
        typeof note === "object" &&
        note !== null &&
        "title" in note &&
        typeof note.title === "string" &&
        "body" in note &&
        typeof note.body === "string" &&
        "tags" in note &&
        Array.isArray(note.tags) &&
        note.tags.every((tag: unknown) => typeof tag === "string"),
    )
  );
}

export default function Home() {
  const storageSnapshot = useSyncExternalStore(
    subscribeToNotesStorage,
    getNotesSnapshot,
    getServerNotesSnapshot,
  );
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isReady = storageSnapshot !== STORAGE_LOADING;
  let notes: Note[] = [];
  let storageError = "";

  if (storageSnapshot === STORAGE_READ_ERROR) {
    storageError =
      "Saved notes could not be read, so adding notes is disabled to protect your data.";
  } else if (storageSnapshot !== null && isReady) {
    try {
      const parsedNotes: unknown = JSON.parse(storageSnapshot);

      if (isNoteList(parsedNotes)) {
        notes = parsedNotes;
      } else {
        storageError =
          "Saved notes could not be read, so adding notes is disabled to protect your data.";
      }
    } catch {
      storageError =
        "Saved notes could not be read, so adding notes is disabled to protect your data.";
    }
  }

  const persistenceError = saveError || storageError;
  const availableTags = Array.from(new Set(notes.flatMap((note) => note.tags)));
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleNotes = notes
    .map((note, index) => ({ note, index }))
    .filter(({ note }) => {
      const matchesTag = !selectedTag || note.tags.includes(selectedTag);
      const matchesSearch =
        !normalizedSearchQuery ||
        note.title.toLocaleLowerCase().includes(normalizedSearchQuery) ||
        note.body.toLocaleLowerCase().includes(normalizedSearchQuery);

      return matchesTag && matchesSearch;
    });

  function handleDeleteNote(noteIndex: number) {
    const updatedNotes = notes.filter((_, index) => index !== noteIndex);

    try {
      saveNotesSnapshot(updatedNotes);
      setDeleteError("");
    } catch {
      setDeleteError(
        "Your note could not be deleted. Your saved notes have not changed. Check your browser storage and try again.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    setError("");
    setIsPending(true);

    try {
      const result = await checkNote(new FormData(form));

      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        saveNotesSnapshot([result.note, ...notes]);
      } catch {
        setSaveError(
          "Your note could not be saved on this device. Check your browser storage and try again.",
        );
        return;
      }

      form.reset();
      setTagsInput("");
    } catch {
      setError("Something went wrong while adding your note. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 bg-[#f3ead7] px-4 py-8 text-[#2e3027] sm:gap-10 sm:px-10 sm:py-16">
      <header className="space-y-3 border-b border-[#b8ad91] pb-6">
        <p className="text-xs font-bold tracking-[0.22em] text-[#a34f36]">
          YOUR PERSONAL SPACE
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[#2e3027] sm:text-5xl">
          Notes
        </h1>
        <p className="max-w-prose text-[#596247]">
          Capture an idea and add tags to find it later.
        </p>
      </header>

      <form
        className="flex flex-col gap-5 rounded-xl border border-[#b8ad91] bg-[#fffaf0] p-4 shadow-[0_8px_24px_rgba(46,48,39,0.08)] sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wide text-[#45463b]"
            htmlFor="title"
          >
            Title
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-[#b8ad91] bg-[#fdf7e9] px-3 py-2 text-[#2e3027] outline-none transition focus:border-[#596247] focus:ring-2 focus:ring-[#596247]/30"
            id="title"
            name="title"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wide text-[#45463b]"
            htmlFor="body"
          >
            Body
          </label>
          <textarea
            className="min-h-36 w-full resize-y rounded-lg border border-[#b8ad91] bg-[#fdf7e9] px-3 py-2 text-[#2e3027] outline-none transition focus:border-[#596247] focus:ring-2 focus:ring-[#596247]/30"
            id="body"
            name="body"
            rows={5}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wide text-[#45463b]"
            htmlFor="tags"
          >
            Tags
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-[#b8ad91] bg-[#fdf7e9] px-3 py-2 text-[#2e3027] outline-none transition focus:border-[#596247] focus:ring-2 focus:ring-[#596247]/30"
            id="tags"
            name="tags"
            placeholder="work, ideas, reading"
            type="text"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
          <p className="text-sm text-[#686852]">
            Separate tags with commas.
          </p>
          <div aria-label="Suggested tags" className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                className="min-h-11 rounded-full border border-[#b8ad91] bg-[#f3ead7] px-4 py-2 text-sm font-medium text-[#596247] transition-colors hover:border-[#596247] hover:bg-[#e9e0cb] focus:outline-none focus:ring-2 focus:ring-[#596247]/40"
                key={tag}
                onClick={() => {
                  const currentTags = tagsInput
                    .split(",")
                    .map((currentTag) => currentTag.trim())
                    .filter(Boolean);

                  if (
                    currentTags.some(
                      (currentTag) => currentTag.toLowerCase() === tag,
                    )
                  ) {
                    return;
                  }

                  setTagsInput([...currentTags, tag].join(", "));
                }}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {persistenceError && (
          <p aria-live="polite" className="rounded-lg border border-[#a34f36]/30 bg-[#a34f36]/5 px-3 py-2 text-sm text-[#8c3f2d]">
            {persistenceError}
          </p>
        )}

        {error && (
          <p aria-live="polite" className="rounded-lg border border-[#a34f36]/30 bg-[#a34f36]/5 px-3 py-2 text-sm text-[#8c3f2d]">
            {error}
          </p>
        )}

        <button
          className="min-h-11 w-full rounded-lg border border-[#8c3f2d] bg-[#a34f36] px-5 py-2 font-semibold tracking-wide text-[#fffaf0] shadow-sm transition-colors hover:bg-[#8c3f2d] focus:outline-none focus:ring-2 focus:ring-[#a34f36]/40 focus:ring-offset-2 focus:ring-offset-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isPending || !isReady || Boolean(persistenceError)}
          type="submit"
        >
          {!isReady ? "Loading notes..." : isPending ? "Adding note..." : "Add note"}
        </button>
      </form>

      <section aria-labelledby="notes-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2
            className="text-xl font-bold tracking-tight text-[#2e3027]"
            id="notes-heading"
          >
            Your notes
          </h2>
          <span className="text-sm font-medium text-[#686852]">
            {visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}
            {selectedTag && ` tagged "${selectedTag}"`}
          </span>
        </div>

        {deleteError && (
          <p aria-live="polite" className="rounded-lg border border-[#a34f36]/30 bg-[#a34f36]/5 px-3 py-2 text-sm text-[#8c3f2d]">
            {deleteError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-semibold tracking-wide text-[#45463b]"
            htmlFor="note-search"
          >
            Search notes
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-[#b8ad91] bg-[#fffaf0] px-3 py-2 text-[#2e3027] outline-none transition focus:border-[#596247] focus:ring-2 focus:ring-[#596247]/30"
            id="note-search"
            name="search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search titles and note bodies"
            type="search"
            value={searchQuery}
          />
        </div>

        {availableTags.length > 0 && (
          <div aria-label="Filter notes by tag" className="flex flex-wrap gap-2">
            <button
              aria-pressed={selectedTag === null}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#596247]/40 ${
                selectedTag === null
                  ? "border-[#596247] bg-[#596247] text-[#fffaf0] shadow-sm"
                  : "border-[#b8ad91] bg-[#fffaf0] text-[#596247] hover:border-[#596247] hover:bg-[#e9e0cb]"
              }`}
              onClick={() => setSelectedTag(null)}
              type="button"
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                aria-pressed={selectedTag === tag}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#596247]/40 ${
                  selectedTag === tag
                    ? "border-[#596247] bg-[#596247] text-[#fffaf0] shadow-sm"
                    : "border-[#b8ad91] bg-[#fffaf0] text-[#596247] hover:border-[#596247] hover:bg-[#e9e0cb]"
                }`}
                key={tag}
                onClick={() => setSelectedTag(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {!isReady && !persistenceError ? (
          <p className="rounded-xl border border-dashed border-[#b8ad91] bg-[#fffaf0]/70 px-5 py-8 text-center text-[#686852]">
            Loading your notes...
          </p>
        ) : persistenceError ? (
          <p className="rounded-xl border border-dashed border-[#b8ad91] bg-[#fffaf0]/70 px-5 py-8 text-center text-[#686852]">
            Notes are unavailable until saved data can be read.
          </p>
        ) : notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#b8ad91] bg-[#fffaf0]/70 px-5 py-8 text-center text-[#686852]">
            Your notes will appear here.
          </p>
        ) : visibleNotes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#b8ad91] bg-[#fffaf0]/70 px-5 py-8 text-center text-[#686852]">
            {normalizedSearchQuery
              ? `No notes match "${searchQuery.trim()}".`
              : `No notes tagged "${selectedTag}".`}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {visibleNotes.map(({ note, index }) => (
              <li
                className="min-w-0 space-y-3 rounded-xl border border-[#b8ad91] bg-[#fffaf0] p-4 shadow-[0_5px_18px_rgba(46,48,39,0.06)] sm:p-5"
                key={index}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="min-w-0 flex-1 text-lg font-bold [overflow-wrap:anywhere] text-[#2e3027]">
                    {note.title}
                  </h3>
                  <button
                    aria-label={`Delete note: ${note.title}`}
                    className="min-h-11 shrink-0 rounded-lg border border-[#a34f36]/40 bg-[#a34f36]/5 px-3 py-2 text-sm font-semibold text-[#8c3f2d] transition-colors hover:bg-[#a34f36]/15 focus:outline-none focus:ring-2 focus:ring-[#a34f36]/40"
                    onClick={() => handleDeleteNote(index)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
                <div className="space-y-3 break-words text-[#45463b]">
                  <ReactMarkdown components={markdownComponents}>
                    {note.body}
                  </ReactMarkdown>
                </div>
                {note.tags.length > 0 && (
                  <ul aria-label="Tags" className="flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <li
                        key={tag}
                      >
                        <button
                          aria-label={`Show notes tagged ${tag}`}
                          aria-pressed={selectedTag === tag}
                          className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#596247]/40 ${
                            selectedTag === tag
                              ? "border-[#596247] bg-[#596247] text-[#fffaf0]"
                              : "border-[#b8ad91] bg-[#f3ead7] text-[#596247] hover:border-[#596247] hover:bg-[#e9e0cb]"
                          }`}
                          onClick={() => setSelectedTag(tag)}
                          type="button"
                        >
                          {tag}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
