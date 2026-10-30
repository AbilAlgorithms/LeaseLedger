import { z } from 'zod';

export const listUsersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.enum(['LANDLORD', 'TENANT', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const updateConfigSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'Config key is required'),
  }),
  body: z.object({
    value: z.any().refine((val) => val !== undefined && val !== null, {
      message: 'Config value is required',
    }),
    description: z.string().optional().default(''),
  }),
});

export const listAuditLogsSchema = z.object({
  query: z.object({
    action: z.string().optional(),
    userId: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});
