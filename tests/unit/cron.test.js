const cron = require('node-cron');
const statsScheduler = require('../../src/cron/statsScheduler');
const cleanupScheduler = require('../../src/cron/cleanupScheduler');
const healthCheckScheduler = require('../../src/cron/healthCheckScheduler');
const schedulers = require('../../src/cron');

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

// Mock queues
jest.mock('../../src/queues', () => ({
  addStatsJob: jest.fn(),
  addCleanupJob: jest.fn(),
  getQueueStats: jest.fn().mockResolvedValue({ waiting: 0, failed: 0 }),
}));

// Mock prisma
jest.mock('../../src/prismaClient', () => ({
  organization: {
    findMany: jest.fn().mockResolvedValue([{ id: 'org-1' }, { id: 'org-2' }]),
  },
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Cron Schedulers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stats Scheduler', () => {
    test('should schedule stats job every 30 minutes', () => {
      statsScheduler.start();
      expect(cron.schedule).toHaveBeenCalledWith('0 */30 * * * *', expect.any(Function));
    });

    test('should stop stats scheduler', () => {
      statsScheduler.start();
      statsScheduler.stop();
      // Verify stop was called on the task object returned by schedule
      const task = cron.schedule.mock.results[0].value;
      expect(task.stop).toHaveBeenCalled();
    });
  });

  describe('Cleanup Scheduler', () => {
    test('should schedule cleanup job daily at 4 AM', () => {
      cleanupScheduler.start();
      expect(cron.schedule).toHaveBeenCalledWith('0 4 * * *', expect.any(Function));
    });

    test('should stop cleanup scheduler', () => {
      cleanupScheduler.start();
      cleanupScheduler.stop();
      const task = cron.schedule.mock.results[0].value;
      expect(task.stop).toHaveBeenCalled();
    });
  });

  describe('Health Check Scheduler', () => {
    test('should schedule health check every 5 minutes', () => {
      healthCheckScheduler.start();
      expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });

    test('should stop health check scheduler', () => {
      healthCheckScheduler.start();
      healthCheckScheduler.stop();
      const task = cron.schedule.mock.results[0].value;
      expect(task.stop).toHaveBeenCalled();
    });
  });

  describe('Scheduler Registry', () => {
    test('should start all schedulers', () => {
      const statsSpy = jest.spyOn(statsScheduler, 'start');
      const cleanupSpy = jest.spyOn(cleanupScheduler, 'start');
      const healthSpy = jest.spyOn(healthCheckScheduler, 'start');

      schedulers.startSchedulers();

      expect(statsSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
      expect(healthSpy).toHaveBeenCalled();
    });

    test('should stop all schedulers', () => {
      const statsSpy = jest.spyOn(statsScheduler, 'stop');
      const cleanupSpy = jest.spyOn(cleanupScheduler, 'stop');
      const healthSpy = jest.spyOn(healthCheckScheduler, 'stop');

      schedulers.stopSchedulers();

      expect(statsSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
      expect(healthSpy).toHaveBeenCalled();
    });
  });
});
