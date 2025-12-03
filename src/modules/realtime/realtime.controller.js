const realtimeService = require('./realtime.service');

const stream = (req, res) => {
  realtimeService.addClient(req, res);
};

module.exports = {
  stream,
};
