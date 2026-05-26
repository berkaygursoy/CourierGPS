const { z } = require('zod');

const merchantCreate = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    address: z.string().min(1),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    phone: z.string().max(20).optional(),
    is_active: z.boolean().optional(),
  }),
});

const merchantUpdate = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(255).optional(),
      address: z.string().min(1).optional(),
      latitude: z.number().gte(-90).lte(90).optional(),
      longitude: z.number().gte(-180).lte(180).optional(),
      phone: z.string().max(20).optional(),
      is_active: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' }),
});

const merchantIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { merchantCreate, merchantUpdate, merchantIdParam };
