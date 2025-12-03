const realtimeService = require('../../src/modules/realtime/realtime.service');
const { redisClient, redisSubscriber } = require('../../src/config/redis');

jest.mock('../../src/config/redis', () => {
  const mRedis = {
    publish: jest.fn(),
    subscribe: jest.fn(),
    on: jest.fn(),
  };
  return {
    redisClient: mRedis,
    redisSubscriber: mRedis,
  };
});

const { redisClient: mockRedisClient, redisSubscriber: mockRedisSubscriber } = require('../../src/config/redis');

describe('RealtimeService', () => {
  afterAll(async () => {
    // Disconnect mock Redis clients
    if (mockRedisClient.disconnect) await mockRedisClient.disconnect();
    if (mockRedisSubscriber.disconnect) await mockRedisSubscriber.disconnect();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a client', () => {
    const req = { user: { id: 1 }, query: {}, on: jest.fn() };
    const res = { writeHead: jest.fn(), write: jest.fn() };

    realtimeService.addClient(req, res);

    expect(realtimeService.clients.size).toBe(1);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }));
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('connected'));
  });

  it('should emit an event to Redis', async () => {
    const type = 'TEST_EVENT';
    const payload = { foo: 'bar' };
    
    await realtimeService.emitEvent(type, payload);

    expect(redisClient.publish).toHaveBeenCalledWith(
      'realtime_events',
      expect.stringContaining(type)
    );
  });
});
