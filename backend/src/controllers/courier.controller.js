const courierSvc = require('../services/courier.service');

async function create(req, res, next) {
  try {
    const courier = await courierSvc.create(req.body);
    res.status(201).json(courier);
  } catch (err) { next(err); }
}

async function list(_req, res, next) {
  try {
    res.json(await courierSvc.list());
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await courierSvc.getById(req.params.id));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await courierSvc.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await courierSvc.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
