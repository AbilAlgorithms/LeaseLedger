import { z } from 'zod';

export const createPropertySchema = z.object({
  body: z.object({
    name: z.string().optional().default(''),
    address: z.string().min(3, 'Address is required and must be at least 3 characters'),
    type: z.enum(['APARTMENT', 'HOUSE', 'ROOM', 'OTHER']).default('APARTMENT'),
    metadata: z
      .object({
        postcode: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
      .optional(),
  }),
});

export const updatePropertySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Property ID is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    address: z.string().min(3).optional(),
    type: z.enum(['APARTMENT', 'HOUSE', 'ROOM', 'OTHER']).optional(),
  }),
});

export const createRoomSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Property ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Room name is required').max(50),
    order: z.number().optional().default(0),
  }),
});

export const updateRoomSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Room ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Room name is required').max(50),
  }),
});

export const createItemSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Room ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Item name is required').max(100),
    category: z.string().default('Other'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
    description: z.string().optional().default(''),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Item ID is required'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
    description: z.string().optional(),
  }),
});
