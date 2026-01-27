import { z } from 'zod';

export const checklistStatusSchema = z.enum([
  'untested',
  'passed',
  'failed',
  'blocked',
  'skipped',
]);

export const newChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional().nullable(),
  status: checklistStatusSchema.optional().default('untested'),
  sort_order: z.number().int().min(0).optional(),
  group_name: z.string().max(100, 'Group name must be 100 characters or less').optional().nullable(),
  version: z.string().optional().nullable(),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional().nullable(),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional().nullable(),
  status: checklistStatusSchema.optional().nullable(),
  sort_order: z.number().int().min(0).optional().nullable(),
  group_name: z.string().max(100, 'Group name must be 100 characters or less').optional().nullable(),
  version: z.string().optional().nullable(),
});

export const checklistFilterSchema = z.object({
  status: checklistStatusSchema.optional().nullable(),
  group_name: z.string().optional().nullable(),
  version: z.string().optional().nullable(),
});

export type NewChecklistItemInput = z.infer<typeof newChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type ChecklistFilterInput = z.infer<typeof checklistFilterSchema>;
