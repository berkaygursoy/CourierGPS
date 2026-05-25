const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let commandClient = null;
let publisherClient = null;
let subscriberClient = null;

function createClient(role) {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });

  client.on('error', (err) => {
    logger.error(`Redis ${role} error`, { message: err.message });
  });

  return client;
}

function getRedis() {
  if (!commandClient) commandClient = createClient('command');
  return commandClient;
}

function getPublisher() {
  if (!publisherClient) publisherClient = createClient('publisher');
  return publisherClient;
}

function getSubscriber() {
  if (!subscriberClient) subscriberClient = createClient('subscriber');
  return subscriberClient;
}

async function closeRedis() {
  const closers = [];
  if (commandClient) {
    closers.push(commandClient.quit());
    commandClient = null;
  }
  if (publisherClient) {
    closers.push(publisherClient.quit());
    publisherClient = null;
  }
  if (subscriberClient) {
    closers.push(subscriberClient.quit());
    subscriberClient = null;
  }
  await Promise.all(closers);
}

module.exports = { getRedis, getPublisher, getSubscriber, closeRedis };
