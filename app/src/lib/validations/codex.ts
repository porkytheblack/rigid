import { z } from 'zod';

export const newCodexEntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  summary: z.string().max(1000, 'Summary must be 1000 characters or less').optional().nullable(),
  what_it_does: z.string().max(10000, 'What it does must be 10000 characters or less').optional().nullable(),
  how_it_works: z.string().max(10000, 'How it works must be 10000 characters or less').optional().nullable(),
  key_files: z.array(z.string()).optional().nullable(),
  dependencies: z.array(z.string()).optional().nullable(),
  gotchas: z.array(z.string()).optional().nullable(),
  is_draft: z.boolean().optional().default(true),
});

export const updateCodexEntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional().nullable(),
  summary: z.string().max(1000, 'Summary must be 1000 characters or less').optional().nullable(),
  what_it_does: z.string().max(10000, 'What it does must be 10000 characters or less').optional().nullable(),
  how_it_works: z.string().max(10000, 'How it works must be 10000 characters or less').optional().nullable(),
  key_files: z.array(z.string()).optional().nullable(),
  dependencies: z.array(z.string()).optional().nullable(),
  gotchas: z.array(z.string()).optional().nullable(),
  is_draft: z.boolean().optional().nullable(),
});

export const codexFilterSchema = z.object({
  is_draft: z.boolean().optional().nullable(),
  search: z.string().optional().nullable(),
});

export type NewCodexEntryInput = z.infer<typeof newCodexEntrySchema>;
export type UpdateCodexEntryInput = z.infer<typeof updateCodexEntrySchema>;
export type CodexFilterInput = z.infer<typeof codexFilterSchema>;
