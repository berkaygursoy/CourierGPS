const { z } = require('zod');

const status = z.enum([
  'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled',
]);

const orderCreate = z.object({
  body: z.object({
    merchant_id: z.string().uuid(),
    customer_name: z.string().min(1).max(255),
    delivery_address: z.string().min(1),
    delivery_lat: z.number().gte(-90).lte(90),
    delivery_lng: z.number().gte(-180).lte(180),
  }),
});

const orderUpdate = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      courier_id: z.string().uuid().nullable().optional(),
      status: status.optional(),
      customer_name: z.string().min(1).max(255).optional(),
      delivery_address: z.string().min(1).optional(),
      delivery_lat: z.number().gte(-90).lte(90).optional(),
      delivery_lng: z.number().gte(-180).lte(180).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' }),
});

const orderIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const orderListQuery = z.object({
  query: z.object({
    status: status.optional(),
    courier_id: z.string().uuid().optional(),
  }),
});

module.exports = { orderCreate, orderUpdate, orderIdParam, orderListQuery };
