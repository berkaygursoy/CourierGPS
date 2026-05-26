const merchantSvc = require('../services/merchant.service');

async function create(req, res, next) {
  try {
    const merchant = await merchantSvc.create(req.body);
    res.status(201).json(merchant);
  } catch (err) { next(err); }
}

async function list(_req, res, next) {
  try {
    const merchants = await merchantSvc.list();
    res.json(merchants);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const merchant = await merchantSvc.getById(req.params.id);
    res.json(merchant);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const merchant = await merchantSvc.update(req.params.id, req.body);
    res.json(merchant);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await merchantSvc.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
