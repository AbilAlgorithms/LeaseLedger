import { z } from 'zod';

export const createTenancySchema = z.object({
  body: z.object({
    propertyId: z.string().min(1, 'Property ID is required'),
    startDate: z.coerce.date({ invalid_type_error: 'Valid start date required' }),
    endDate: z.coerce.date({ invalid_type_error: 'Valid end date required' }),
    notes: z.string().optional().default(''),
    inviteEmail: z.string().email().optional().or(z.literal('')),
  }).refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
});

export const updateTenancySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Tenancy ID is required'),
  }),
  body: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});

export const createInvitationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Tenancy ID is required'),
  }),
  body: z.object({
    email: z.string().email().optional().or(z.literal('')),
  }),
});
