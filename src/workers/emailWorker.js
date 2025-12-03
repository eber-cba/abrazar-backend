const { Worker, QueueEvents } = require('bullmq');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Email Worker - Procesa jobs de envío de emails y notificaciones
 * 
 * Este worker consume jobs de la cola 'email' y envía emails usando
 * el servicio de email configurado (SendGrid, Nodemailer, etc.)
 */

/**
 * Procesa un job de envío de email
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.to - Email destinatario
 * @param {string} job.data.subject - Asunto del email
 * @param {string} job.data.body - Cuerpo del email (HTML o texto)
 * @param {string} job.data.template - Template a usar (opcional)
 * @param {Object} job.data.templateData - Datos para el template (opcional)
 */
async function processEmailJob(job) {
  const { to, subject, body, template, templateData } = job.data;
  
  logger.info(`Processing email job to: ${to}, subject: ${subject}`);
  
  try {
    // TODO: Implementar servicio de email real (SendGrid, Nodemailer, etc.)
    // Por ahora, solo logueamos el email
    
    let emailContent = body;
    
    // Si hay template, renderizarlo
    if (template) {
      emailContent = renderEmailTemplate(template, templateData);
    }
    
    // Simular envío de email
    logger.info(`Email sent successfully to ${to}`);
    logger.debug(`Email content: ${emailContent.substring(0, 100)}...`);
    
    // En producción, aquí iría la integración real:
    // await emailService.send({ to, subject, html: emailContent });
    
    return {
      success: true,
      to,
      subject,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    throw error; // BullMQ reintentará automáticamente
  }
}

/**
 * Renderiza un template de email con datos
 * @param {string} template - Nombre del template
 * @param {Object} data - Datos para el template
 */
function renderEmailTemplate(template, data = {}) {
  const templates = {
    'welcome': (data) => `
      <h1>¡Bienvenido a Abrazar, ${data.name}!</h1>
      <p>Gracias por unirte a nuestra plataforma.</p>
      <p>Tu cuenta ha sido creada exitosamente.</p>
    `,
    
    'case-assigned': (data) => `
      <h1>Nuevo caso asignado</h1>
      <p>Hola ${data.userName},</p>
      <p>Se te ha asignado un nuevo caso: <strong>${data.caseName}</strong></p>
      <p>Estado: ${data.caseStatus}</p>
      <p>Por favor, revisa los detalles en la plataforma.</p>
    `,
    
    'emergency-alert': (data) => `
      <h1 style="color: red;">⚠️ ALERTA DE EMERGENCIA</h1>
      <p>Se ha marcado un caso como emergencia de nivel ${data.emergencyLevel}</p>
      <p>Caso: <strong>${data.caseName}</strong></p>
      <p>Ubicación: ${data.location}</p>
      <p>Requiere atención inmediata.</p>
    `,
    
    'password-reset': (data) => `
      <h1>Restablecer contraseña</h1>
      <p>Hola ${data.name},</p>
      <p>Has solicitado restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para continuar:</p>
      <a href="${data.resetLink}">Restablecer contraseña</a>
      <p>Este enlace expira en 1 hora.</p>
    `,
  };
  
  const templateFn = templates[template];
  
  if (!templateFn) {
    logger.warn(`Template ${template} not found, using default`);
    return `<p>${data.message || 'Mensaje del sistema Abrazar'}</p>`;
  }
  
  return templateFn(data);
}

/**
 * Procesa un job de envío masivo de emails
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {Array} job.data.recipients - Array de destinatarios
 * @param {string} job.data.subject - Asunto del email
 * @param {string} job.data.template - Template a usar
 * @param {Object} job.data.templateData - Datos para el template
 */
async function processBulkEmailJob(job) {
  const { recipients, subject, template, templateData } = job.data;
  
  logger.info(`Processing bulk email job to ${recipients.length} recipients`);
  
  try {
    const results = [];
    
    // Enviar emails en lotes de 10 para no sobrecargar
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      
      const batchResults = await Promise.allSettled(
        batch.map((recipient) =>
          processEmailJob({
            data: {
              to: recipient.email,
              subject,
              template,
              templateData: { ...templateData, ...recipient },
            },
          })
        )
      );
      
      results.push(...batchResults);
      
      // Pequeña pausa entre lotes
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    
    logger.info(`Bulk email completed: ${successful} successful, ${failed} failed`);
    
    return {
      success: true,
      total: recipients.length,
      successful,
      failed,
    };
  } catch (error) {
    logger.error('Error processing bulk email:', error);
    throw error;
  }
}

/**
 * Procesa un job de notificación push
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.userId - ID del usuario destinatario
 * @param {string} job.data.title - Título de la notificación
 * @param {string} job.data.body - Cuerpo de la notificación
 * @param {Object} job.data.data - Datos adicionales
 */
async function processNotificationJob(job) {
  const { userId, title, body, data } = job.data;
  
  logger.info(`Processing notification job for user ${userId}`);
  
  try {
    // TODO: Implementar servicio de notificaciones push (Firebase, OneSignal, etc.)
    // Por ahora, solo logueamos
    
    logger.info(`Notification sent to user ${userId}: ${title}`);
    
    // En producción, aquí iría la integración real:
    // await notificationService.send({ userId, title, body, data });
    
    return {
      success: true,
      userId,
      title,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error sending notification to user ${userId}:`, error);
    throw error;
  }
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

const emailWorker = new Worker(
  'email',
  async (job) => {
    switch (job.name) {
      case 'send-email':
        return await processEmailJob(job);
      
      case 'send-bulk-email':
        return await processBulkEmailJob(job);
      
      case 'send-notification':
        return await processNotificationJob(job);
      
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisClient,
    concurrency: 3, // Procesar hasta 3 emails simultáneamente
    limiter: {
      max: 50, // Máximo 50 emails
      duration: 60000, // por minuto (rate limiting)
    },
  }
);

// Event listeners
emailWorker.on('completed', (job) => {
  logger.info(`Email worker completed job ${job.id}`);
});

emailWorker.on('failed', (job, error) => {
  logger.error(`Email worker failed job ${job?.id}:`, error);
});

emailWorker.on('error', (error) => {
  logger.error('Email worker error:', error);
});

logger.info('Email worker initialized and ready');

// QueueEvents para escuchar eventos de la cola
const queueEvents = new QueueEvents('email', { connection: redisClient });

module.exports = {
  emailWorker,
  queueEvents,
  close: async () => {
    await emailWorker.close();
    await queueEvents.close();
  },
};
