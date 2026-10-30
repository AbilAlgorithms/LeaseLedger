import { z } from 'zod';

export const createIssueSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title is required (min 3 characters)').max(150),
    description: z.string().min(10, 'Detailed description is required (min 10 characters)'),
  }),
});

export const updateIssueStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
    resolutionNotes: z.string().optional().default(''),
  }),
});
