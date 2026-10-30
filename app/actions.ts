"use server";

type Note = {
  title: string;
  body: string;
  tags: string[];
};

type CheckNoteResult = { error: string } | { note: Note };

export async function checkNote(formData: FormData): Promise<CheckNoteResult> {
  const title = formData.get("title");
  const body = formData.get("body");
  const tagsField = formData.get("tags");

  if (typeof title !== "string" || title.trim() === "") {
    return { error: "Please enter a title." };
  }

  if (typeof body !== "string" || body.trim() === "") {
    return { error: "Please enter a body." };
  }

  if (tagsField !== null && typeof tagsField !== "string") {
    return { error: "Please enter tags as comma-separated text." };
  }

  const tags = Array.from(
    new Set(
      (tagsField ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return {
    note: {
      title,
      body,
      tags,
    },
  };
}
