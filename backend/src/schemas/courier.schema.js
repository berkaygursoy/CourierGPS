const { z } = require('zod');

const vehicleType = z.enum(['bike', 'motorcycle', 'car']);
const status = z.enum(['offline', 'idle', 'delivering']);

const courierCreate = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    phone: z.string().min(1).max(20),
    vehicle_type: vehicleType.optional(),
    status: status.optional(),
  }),
});

const courierUpdate = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(255).optional(),
      phone: z.string().min(1).max(20).optional(),
      vehicle_type: vehicleType.optional(),
      status: status.optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' }),
});

const courierIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { courierCreate, courierUpdate, courierIdParam };
