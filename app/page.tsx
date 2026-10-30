"use client";

import { useState, type FormEvent } from "react";
import { checkNote } from "./actions";

type Note = {
  title: string;
  body: string;
  tags: string[];
};

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

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

      setNotes((currentNotes) => [result.note, ...currentNotes]);
      form.reset();
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
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Separate tags with commas.
          </p>
        </div>

        {error && (
          <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          className="self-start rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Adding note..." : "Add note"}
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
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Your notes will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {notes.map((note, index) => (
              <li
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                key={`${note.title}-${index}`}
              >
                <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {note.title}
                </h3>
                <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {note.body}
                </p>
                {note.tags.length > 0 && (
                  <ul aria-label="Tags" className="flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <li
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        key={tag}
                      >
                        {tag}
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
