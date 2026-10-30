import { z } from 'zod';

export const createInspectionSchema = z.object({
  body: z.object({
    type: z.enum(['MOVE_IN', 'MOVE_OUT']),
  }),
});

export const updateConditionRecordSchema = z.object({
  body: z.object({
    rating: z.number().min(0).max(5),
    ratingLabel: z.string().optional().default(''),
    notes: z.string().optional().default(''),
  }),
});

export const updateMeterSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    meterType: z.enum(['ELECTRICITY', 'WATER', 'GAS']),
  }),
  body: z.object({
    value: z.number().min(0, 'Reading value must be non-negative'),
    unit: z.string().optional().default('units'),
    readingDate: z.coerce.date().optional(),
    photoUrl: z.string().optional(),
  }),
});

export const disputeRecordSchema = z.object({
  body: z.object({
    reason: z.string().min(3, 'Dispute reason must be provided (min 3 characters)'),
  }),
});

export const createAmendmentSchema = z.object({
  body: z.object({
    reason: z.string().min(5, 'Amendment justification is required (min 5 characters)'),
    target: z.object({
      model: z.enum(['ConditionRecord', 'MeterReading']),
      id: z.string().min(1),
    }),
    before: z.any(),
    after: z.any(),
  }),
});
