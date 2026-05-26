const express = require('express');
const controller = require('../controllers/merchant.controller');
const { validate } = require('../middleware/validate');
const {
  merchantCreate,
  merchantUpdate,
  merchantIdParam,
} = require('../schemas/merchant.schema');

const router = express.Router();

router.post('/', validate(merchantCreate), controller.create);
router.get('/', controller.list);
router.get('/:id', validate(merchantIdParam), controller.getOne);
router.patch('/:id', validate(merchantUpdate), controller.update);
router.delete('/:id', validate(merchantIdParam), controller.remove);

module.exports = router;
