import { z } from "zod";

export const sectionTypes = ["intro", "verse", "chorus", "bridge", "outro"] as const;

const cleanText = (value: string) =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

export const chordSchema = z.object({
  chord: z.string().min(1).max(24).transform(cleanText),
  at: z.coerce.number().int().min(0).max(240),
});

export const songLineSchema = z.object({
  lyrics: z.string().max(500).transform((value) => cleanText(value)),
  chords: z.array(chordSchema).default([]),
});

export const songSectionSchema = z.object({
  type: z.enum(sectionTypes),
  title: z.string().max(120).optional().default("").transform(cleanText),
  lines: z.array(songLineSchema).min(1).default([{ lyrics: "", chords: [] }]),
});

export const songContentSchema = z.object({
  sections: z.array(songSectionSchema).min(1),
});

export const loginSchema = z.object({
  identifier: z.string().min(1).max(191).transform((value) => value.toLowerCase().trim()),
  password: z.string().min(6).max(200),
});

export const inviteUserSchema = z.object({
  email: z.string().email().max(191).transform((value) => value.toLowerCase().trim()),
});

export const setPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  name: z.string().max(120).optional().default("").transform(cleanText),
  password: z.string().min(8).max(200),
});

export const songPayloadSchema = z.object({
  title: z.string().min(1).max(180).transform(cleanText),
  hasChords: z.coerce.boolean().default(true),
  isPublished: z.coerce.boolean().default(false),
  content: songContentSchema,
  categoryId: z.coerce.number().int().positive().nullable().optional(),
});

export const categoryPayloadSchema = z.object({
  name: z.string().min(1).max(140).transform(cleanText),
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

export const assignSongSchema = z.object({
  songId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  categorySongId: z.coerce.number().int().positive().optional(),
});

export const orderPayloadSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        parentId: z.coerce.number().int().positive().nullable(),
        sortOrder: z.coerce.number().int().min(0),
      }),
    )
    .default([]),
  categorySongs: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        categoryId: z.coerce.number().int().positive(),
        sortOrder: z.coerce.number().int().min(0),
      }),
    )
    .default([]),
});

export const bulkSongsSchema = z.object({
  slugs: z.array(z.string().min(1).max(191)).max(200),
});

export type SectionType = (typeof sectionTypes)[number];
export type SongContentData = z.infer<typeof songContentSchema>;
export type SongSectionData = z.infer<typeof songSectionSchema>;
export type SongLineData = z.infer<typeof songLineSchema>;
export type ChordData = z.infer<typeof chordSchema>;

export const emptySongContent: SongContentData = {
  sections: [
    {
      type: "verse",
      title: "Verso 1",
      lines: [{ lyrics: "", chords: [] }],
    },
  ],
};

export function normalizeSongContent(value: unknown): SongContentData {
  const parsed = songContentSchema.safeParse(value);
  return parsed.success ? parsed.data : emptySongContent;
}
