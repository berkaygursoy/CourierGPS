export const qk = {
  merchants: {
    all: () => ['merchants'],
  },
  couriers: {
    all: () => ['couriers'],
  },
  orders: {
    all: () => ['orders'],
    byStatus: (status) => ['orders', { status }],
  },
};
