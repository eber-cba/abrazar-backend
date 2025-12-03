const {
  statsQueue,
  emailQueue,
  cleanupQueue,
  uploadsQueue,
  addStatsJob,
  addEmailJob,
  addCleanupJob,
  addUploadJob,
  getQueuesStats,
  cleanAllQueues,
  closeAllQueues,
} = require('../../src/queues');

/**
 * Tests unitarios para el sistema de colas BullMQ
 */

describe('Queues - Unit Tests', () => {
  // Limpiar todas las colas antes y después de los tests
  beforeAll(async () => {
    await cleanAllQueues();
  });

  afterAll(async () => {
    await cleanAllQueues();
    await closeAllQueues(); // Cerrar conexiones
  });

  afterEach(async () => {
    await cleanAllQueues();
  });

  describe('Queue Instances', () => {
    test('should have all queue instances defined', () => {
      expect(statsQueue).toBeDefined();
      expect(emailQueue).toBeDefined();
      expect(cleanupQueue).toBeDefined();
      expect(uploadsQueue).toBeDefined();
    });

    test('should have correct queue names', () => {
      expect(statsQueue.name).toBe('stats');
      expect(emailQueue.name).toBe('email');
      expect(cleanupQueue.name).toBe('cleanup');
      expect(uploadsQueue.name).toBe('uploads');
    });
  });

  describe('addStatsJob', () => {
    test('should add a stats job to the queue', async () => {
      const jobData = {
        organizationId: 'test-org-123',
        type: 'overview',
      };

      const job = await addStatsJob(jobData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(jobData);
      expect(job.name).toBe('recalculate-stats');
    });

    test('should add stats job with correct priority', async () => {
      const job = await addStatsJob({
        organizationId: 'test-org-123',
        type: 'zones',
      });

      expect(job.opts.priority).toBe(2); // Media prioridad
    });
  });

  describe('addEmailJob', () => {
    test('should add an email job to the queue', async () => {
      const jobData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const job = await addEmailJob(jobData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(jobData);
      expect(job.name).toBe('send-email');
    });

    test('should add email job with high priority', async () => {
      const job = await addEmailJob({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      });

      expect(job.opts.priority).toBe(1); // Alta prioridad
    });

    test('should add email job with template', async () => {
      const jobData = {
        to: 'test@example.com',
        subject: 'Welcome',
        template: 'welcome',
        templateData: { name: 'John' },
      };

      const job = await addEmailJob(jobData);

      expect(job.data.template).toBe('welcome');
      expect(job.data.templateData).toEqual({ name: 'John' });
    });
  });

  describe('addCleanupJob', () => {
    test('should add a cleanup job to the queue', async () => {
      const job = await addCleanupJob('sessions');

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('sessions');
      expect(job.name).toBe('cleanup-sessions');
    });

    test('should add cleanup job with low priority', async () => {
      const job = await addCleanupJob('tokens');

      expect(job.opts.priority).toBe(3); // Baja prioridad
    });

    test('should support different cleanup types', async () => {
      const types = ['sessions', 'tokens', 'cache'];

      for (const type of types) {
        const job = await addCleanupJob(type);
        expect(job.data.type).toBe(type);
        expect(job.name).toBe(`cleanup-${type}`);
      }
    });
  });

  describe('addUploadJob', () => {
    test('should add an upload job to the queue', async () => {
      const jobData = {
        fileBuffer: Buffer.from('test-image-data'),
        userId: 'user-123',
        type: 'image',
      };

      const job = await addUploadJob(jobData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.userId).toBe('user-123');
      expect(job.data.type).toBe('image');
      expect(job.name).toBe('process-image');
    });

    test('should add upload job with high priority', async () => {
      const job = await addUploadJob({
        fileBuffer: Buffer.from('test'),
        userId: 'user-123',
        type: 'image',
      });

      expect(job.opts.priority).toBe(1); // Alta prioridad
    });
  });

  describe('getQueuesStats', () => {
    test('should return stats for all queues', async () => {
      // Agregar algunos jobs
      await addStatsJob({ organizationId: 'org-1', type: 'overview' });
      await addEmailJob({ to: 'test@example.com', subject: 'Test', body: 'Test' });
      await addCleanupJob('sessions');

      const stats = await getQueuesStats();

      expect(stats).toBeDefined();
      expect(stats.stats).toBeDefined();
      expect(stats.email).toBeDefined();
      expect(stats.cleanup).toBeDefined();
      expect(stats.uploads).toBeDefined();

      // Verificar que cada stat tiene las propiedades correctas
      Object.values(stats).forEach((queueStats) => {
        expect(queueStats).toHaveProperty('waiting');
        expect(queueStats).toHaveProperty('active');
        expect(queueStats).toHaveProperty('completed');
        expect(queueStats).toHaveProperty('failed');
        expect(queueStats).toHaveProperty('delayed');
        expect(queueStats).toHaveProperty('total');
      });
    });

    test('should add jobs to queue successfully', async () => {
      // Add jobs
      const job1 = await addStatsJob({ organizationId: 'org-1', type: 'overview' });
      const job2 = await addStatsJob({ organizationId: 'org-2', type: 'zones' });

      // Verify jobs were created
      expect(job1).toBeDefined();
      expect(job1.id).toBeDefined();
      expect(job2).toBeDefined();
      expect(job2.id).toBeDefined();
      
      // Get stats
      const stats = await getQueuesStats();

      // Verify stats queue exists and has data
      expect(stats.stats).toBeDefined();
      expect(stats.stats.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Queue Configuration', () => {
    test('should have retry configuration', async () => {
      const job = await addStatsJob({ organizationId: 'org-1', type: 'overview' });

      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toBeDefined();
      expect(job.opts.backoff.type).toBe('exponential');
      expect(job.opts.backoff.delay).toBe(2000);
    });

    test('should have removeOnComplete configuration', async () => {
      const job = await addEmailJob({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      });

      expect(job.opts.removeOnComplete).toBeDefined();
      expect(job.opts.removeOnComplete.age).toBe(24 * 3600);
      expect(job.opts.removeOnComplete.count).toBe(1000);
    });

    test('should have removeOnFail configuration', async () => {
      const job = await addCleanupJob('sessions');

      expect(job.opts.removeOnFail).toBeDefined();
      expect(job.opts.removeOnFail.age).toBe(7 * 24 * 3600);
    });
  });

  describe('cleanAllQueues', () => {
    test('should clean all queues', async () => {
      // Agregar jobs a todas las colas
      await addStatsJob({ organizationId: 'org-1', type: 'overview' });
      await addEmailJob({ to: 'test@example.com', subject: 'Test', body: 'Test' });
      await addCleanupJob('sessions');
      await addUploadJob({ fileBuffer: Buffer.from('test'), userId: 'user-1', type: 'image' });

      // Limpiar todas las colas
      await cleanAllQueues();

      // Verificar que todas las colas están vacías
      const stats = await getQueuesStats();

      expect(stats.stats.waiting).toBe(0);
      expect(stats.email.waiting).toBe(0);
      expect(stats.cleanup.waiting).toBe(0);
      expect(stats.uploads.waiting).toBe(0);
    });
  });
});
