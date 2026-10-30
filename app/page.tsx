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
    <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold tracking-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-950 dark:text-zinc-50">
      {children}
    </strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-6">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
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
  const [tagsInput, setTagsInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
  const visibleNotes = selectedTag
    ? notes.filter((note) => note.tags.includes(selectedTag))
    : notes;

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16 sm:px-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400">
          YOUR PERSONAL SPACE
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Notes
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Capture an idea and add tags to find it later.
        </p>
      </header>

      <form
        className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            htmlFor="title"
          >
            Title
          </label>
          <input
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50"
            id="title"
            name="title"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            htmlFor="body"
          >
            Body
          </label>
          <textarea
            className="min-h-36 resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50"
            id="body"
            name="body"
            rows={5}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            htmlFor="tags"
          >
            Tags
          </label>
          <input
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50"
            id="tags"
            name="tags"
            placeholder="work, ideas, reading"
            type="text"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Separate tags with commas.
          </p>
          <div aria-label="Suggested tags" className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 transition-colors hover:border-blue-500 hover:text-blue-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-blue-300"
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
          <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
            {persistenceError}
          </p>
        )}

        {error && (
          <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          className="self-start rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !isReady || Boolean(persistenceError)}
          type="submit"
        >
          {!isReady ? "Loading notes..." : isPending ? "Adding note..." : "Add note"}
        </button>
      </form>

      <section aria-labelledby="notes-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
            id="notes-heading"
          >
            Your notes
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}
            {selectedTag && ` tagged "${selectedTag}"`}
          </span>
        </div>

        {availableTags.length > 0 && (
          <div aria-label="Filter notes by tag" className="flex flex-wrap gap-2">
            <button
              aria-pressed={selectedTag === null}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                selectedTag === null
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-300 text-zinc-700 hover:border-blue-500 dark:border-zinc-700 dark:text-zinc-300"
              }`}
              onClick={() => setSelectedTag(null)}
              type="button"
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                aria-pressed={selectedTag === tag}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedTag === tag
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-blue-500 dark:border-zinc-700 dark:text-zinc-300"
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
          <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Loading your notes...
          </p>
        ) : persistenceError ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Notes are unavailable until saved data can be read.
          </p>
        ) : notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Your notes will appear here.
          </p>
        ) : visibleNotes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No notes tagged &quot;{selectedTag}&quot;.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {visibleNotes.map((note, index) => (
              <li
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                key={`${note.title}-${index}`}
              >
                <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {note.title}
                </h3>
                <div className="space-y-3 break-words text-zinc-700 dark:text-zinc-300">
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
                          className={`rounded-full px-3 py-1 text-sm transition-colors ${
                            selectedTag === tag
                              ? "bg-blue-600 text-white"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
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
