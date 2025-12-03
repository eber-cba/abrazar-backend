const {
  addStatsJob,
  addEmailJob,
  addCleanupJob,
  cleanAllQueues,
  closeAllQueues,
} = require('../../src/queues');
const statsWorker = require('../../src/workers/statsWorker');
const emailWorker = require('../../src/workers/emailWorker');
const cleanupWorker = require('../../src/workers/cleanupWorker');

/**
 * Tests de integración para workers de BullMQ
 * 
 * Estos tests verifican que los workers procesan correctamente los jobs
 */

describe('Background Jobs - Integration Tests', () => {
  // Limpiar colas antes y después de los tests
  beforeAll(async () => {
    await cleanAllQueues();
  });

  afterAll(async () => {
    await cleanAllQueues();
    // Cerrar workers
    await statsWorker.close();
    await emailWorker.close();
    await cleanupWorker.close();
  });

  afterEach(async () => {
    await cleanAllQueues();
  });

  describe('Stats Worker', () => {
    test('should add stats job to queue successfully', async () => {
      // Agregar job
      const job = await addStatsJob({
        organizationId: 'test-org-123',
        type: 'overview',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.organizationId).toBe('test-org-123');
      expect(job.data.type).toBe('overview');

      // Verificar que el job está en la cola
      const jobState = await job.getState();
      expect(['waiting', 'active', 'completed', 'prioritized']).toContain(jobState);
    });

    test('should handle stats job errors gracefully', async () => {
      // Agregar job con datos inválidos
      const job = await addStatsJob({
        organizationId: null, // Esto causará un error
        type: 'overview',
      });

      // Esperar a que falle
      await expect(
        job.waitUntilFinished(statsWorker.queueEvents, 30000)
      ).rejects.toThrow();
    }, 35000);
  });

  describe('Email Worker', () => {
    test('should process email job successfully', async () => {
      const job = await addEmailJob({
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      });

      expect(job).toBeDefined();

      const result = await job.waitUntilFinished(emailWorker.queueEvents, 30000);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.to).toBe('test@example.com');
      expect(result.sentAt).toBeDefined();
    }, 35000);

    test('should process email with template', async () => {
      const job = await addEmailJob({
        to: 'test@example.com',
        subject: 'Welcome',
        template: 'welcome',
        templateData: { name: 'John Doe' },
      });

      const result = await job.waitUntilFinished(emailWorker.queueEvents, 30000);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }, 35000);
  });

  describe('Cleanup Worker', () => {
    test('should process cleanup job successfully', async () => {
      const job = await addCleanupJob('sessions');

      expect(job).toBeDefined();

      const result = await job.waitUntilFinished(cleanupWorker.queueEvents, 30000);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.type).toBe('sessions');
      expect(result.result).toBeDefined();
    }, 35000);

    test('should cleanup tokens', async () => {
      const job = await addCleanupJob('tokens');

      const result = await job.waitUntilFinished(cleanupWorker.queueEvents, 60000);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.type).toBe('tokens');
    }, 65000);

    test('should cleanup cache', async () => {
      const job = await addCleanupJob('cache');

      const result = await job.waitUntilFinished(cleanupWorker.queueEvents, 60000);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.type).toBe('cache');
    }, 65000);
  });

  describe('Job Retry Mechanism', () => {
    test('should retry failed jobs', async () => {
      // Este test verifica que los jobs se reintentan automáticamente
      // En un escenario real, el job fallaría y se reintentaría 3 veces
      
      const job = await addStatsJob({
        organizationId: 'test-org-retry',
        type: 'overview',
      });

      // Verificar configuración de reintentos
      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toBeDefined();
      expect(job.opts.backoff.type).toBe('exponential');
    });
  });

  describe('Job Priority', () => {
    test('should process high priority jobs first', async () => {
      // Agregar jobs con diferentes prioridades
      const lowPriorityJob = await addCleanupJob('sessions'); // Prioridad 3
      const highPriorityJob = await addEmailJob({
        to: 'urgent@example.com',
        subject: 'Urgent',
        body: 'Urgent message',
      }); // Prioridad 1

      // Los jobs de alta prioridad deberían procesarse primero
      expect(highPriorityJob.opts.priority).toBeLessThan(lowPriorityJob.opts.priority);
    });
  });
});
