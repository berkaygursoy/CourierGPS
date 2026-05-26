const express = require('express');
const controller = require('../controllers/order.controller');
const { validate } = require('../middleware/validate');
const {
  orderCreate,
  orderUpdate,
  orderIdParam,
  orderListQuery,
} = require('../schemas/order.schema');

const router = express.Router();

router.post('/', validate(orderCreate), controller.create);
router.get('/', validate(orderListQuery), controller.list);
router.get('/:id', validate(orderIdParam), controller.getOne);
router.patch('/:id', validate(orderUpdate), controller.update);
router.delete('/:id', validate(orderIdParam), controller.remove);

module.exports = router;
