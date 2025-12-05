// Mock Redis before requiring the service
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn((channel, cb) => cb(null, 1)),
    on: jest.fn(),
    once: jest.fn(),
    status: 'ready',
  };
  return {
    redisClient: mRedis,
    redisSubscriber: mRedis,
  };
});

const realtimeService = require('../../src/modules/realtime/realtime.service');
const { redisClient } = require('../../src/config/redis');

describe('RealtimeService', () => {
  beforeAll(async () => {
    // Set isRedisAvailable to true for tests
    realtimeService.isRedisAvailable = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a client', () => {
    const req = { user: { id: 1 }, query: {}, on: jest.fn() };
    const res = { writeHead: jest.fn(), write: jest.fn() };

    realtimeService.addClient(req, res);

    expect(realtimeService.clients.size).toBeGreaterThanOrEqual(1);
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
