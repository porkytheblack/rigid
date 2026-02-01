import { z } from 'zod';

export const issueStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
  'wont_fix',
]);

export const issuePrioritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
]);

export const issueSourceTypeSchema = z.enum([
  'session',
  'screenshot',
  'manual',
]);

export const newIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(10000, 'Description must be 10000 characters or less').optional().nullable(),
  status: issueStatusSchema.optional().default('open'),
  priority: issuePrioritySchema.optional().default('medium'),
  version: z.string().optional().nullable(),
  codex_entry_id: z.string().optional().nullable(),
  source_type: issueSourceTypeSchema.optional().nullable(),
  source_id: z.string().optional().nullable(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional().nullable(),
  description: z.string().max(10000, 'Description must be 10000 characters or less').optional().nullable(),
  status: issueStatusSchema.optional().nullable(),
  priority: issuePrioritySchema.optional().nullable(),
  version: z.string().optional().nullable(),
  codex_entry_id: z.string().optional().nullable(),
  source_type: issueSourceTypeSchema.optional().nullable(),
  source_id: z.string().optional().nullable(),
});

export const issueFilterSchema = z.object({
  status: issueStatusSchema.optional().nullable(),
  priority: issuePrioritySchema.optional().nullable(),
  version: z.string().optional().nullable(),
  source_type: issueSourceTypeSchema.optional().nullable(),
});

export type NewIssueInput = z.infer<typeof newIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type IssueFilterInput = z.infer<typeof issueFilterSchema>;
