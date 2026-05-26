const orderSvc = require('../services/order.service');

async function create(req, res, next) {
  try {
    const order = await orderSvc.create(req.body);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json(await orderSvc.list(req.query));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await orderSvc.getById(req.params.id));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await orderSvc.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await orderSvc.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
