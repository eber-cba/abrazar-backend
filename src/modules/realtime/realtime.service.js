const { redisClient, redisSubscriber } = require('../../config/redis');

class RealtimeService {
  constructor() {
    this.clients = new Set();
    this.channel = 'realtime_events';
    this.init();
  }

  init() {
    redisSubscriber.subscribe(this.channel, (err, count) => {
      if (err) {
        console.error('Failed to subscribe to realtime channel:', err);
      } else {
        console.log(`Subscribed to ${this.channel}. Count: ${count}`);
      }
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === this.channel) {
        try {
          const event = JSON.parse(message);
          this.broadcastToLocalClients(event);
        } catch (error) {
          console.error('Error parsing realtime message:', error);
        }
      }
    });
  }

  addClient(req, res) {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', // For Nginx
    };
    res.writeHead(200, headers);

    const client = {
      id: Date.now(),
      res,
      user: req.user, // Assuming user is attached to req
      query: req.query, // Filters like orgId, zones
    };

    this.clients.add(client);

    // Send initial connection message
    const initialData = `data: ${JSON.stringify({ type: 'connected', message: 'Connected to realtime stream' })}\n\n`;
    res.write(initialData);

    req.on('close', () => {
      this.clients.delete(client);
    });
  }

  async emitEvent(type, payload, filters = {}) {
    const event = {
      type,
      payload,
      filters, // e.g., { organizationId: '...', zoneId: '...' }
      timestamp: new Date().toISOString(),
    };

    // Publish to Redis so all instances receive it
    await redisClient.publish(this.channel, JSON.stringify(event));
  }

  broadcastToLocalClients(event) {
    this.clients.forEach((client) => {
      if (this.shouldSendToClient(client, event)) {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
        client.res.write(data);
      }
    });
  }

  shouldSendToClient(client, event) {
    // Implement filtering logic here
    // Example: Organization filter
    if (event.filters && event.filters.organizationId) {
      if (client.user?.organizationId !== event.filters.organizationId && client.user?.role !== 'ADMIN') {
        return false;
      }
    }
    
    // Example: Zone filter
    if (event.filters && event.filters.zoneId) {
       // Check if user is assigned to this zone (logic depends on user model)
       // For now, pass through
    }

    return true;
  }
}

module.exports = new RealtimeService();
