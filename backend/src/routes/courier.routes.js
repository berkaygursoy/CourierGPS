const express = require('express');
const controller = require('../controllers/courier.controller');
const { validate } = require('../middleware/validate');
const {
  courierCreate,
  courierUpdate,
  courierIdParam,
} = require('../schemas/courier.schema');

const router = express.Router();

router.post('/', validate(courierCreate), controller.create);
router.get('/', controller.list);
router.get('/:id', validate(courierIdParam), controller.getOne);
router.patch('/:id', validate(courierUpdate), controller.update);
router.delete('/:id', validate(courierIdParam), controller.remove);

module.exports = router;
