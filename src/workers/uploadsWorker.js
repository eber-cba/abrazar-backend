const { Worker, QueueEvents } = require('bullmq');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');
const prisma = require('../prismaClient');
const cloudinary = require('../config/cloudinary');

/**
 * Uploads Worker - Procesa jobs de procesamiento de imágenes y documentos
 * 
 * Este worker consume jobs de la cola 'uploads' y procesa archivos:
 * - Redimensiona y comprime imágenes
 * - Sube archivos a Cloudinary
 * - Actualiza URLs en la base de datos
 */

/**
 * Procesa un job de procesamiento de imagen
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.fileBuffer - Buffer del archivo (base64)
 * @param {string} job.data.userId - ID del usuario que subió el archivo
 * @param {string} job.data.entityType - Tipo de entidad ('case', 'homeless', 'user')
 * @param {string} job.data.entityId - ID de la entidad
 * @param {string} job.data.fieldName - Nombre del campo a actualizar ('photoUrl', 'imageUrl', etc.)
 */
async function processImageJob(job) {
  const { fileBuffer, userId, entityType, entityId, fieldName = 'photoUrl' } = job.data;
  
  logger.info(`Processing image upload for ${entityType} ${entityId}`);
  
  try {
    // 1. Validar que el buffer existe
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }
    
    // 2. Convertir base64 a buffer si es necesario
    const buffer = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer, 'base64');
    
    // 3. Subir a Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: `abrazar/${entityType}s`,
      public_id: `${entityType}_${entityId}_${Date.now()}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Máximo 800x800
        { quality: 'auto:good' }, // Compresión automática
        { fetch_format: 'auto' }, // Formato óptimo (WebP si es soportado)
      ],
    });
    
    const imageUrl = uploadResult.secure_url;
    
    logger.info(`Image uploaded to Cloudinary: ${imageUrl}`);
    
    // 4. Actualizar URL en la base de datos
    await updateEntityImage(entityType, entityId, fieldName, imageUrl);
    
    logger.info(`Image URL updated in database for ${entityType} ${entityId}`);
    
    return {
      success: true,
      imageUrl,
      entityType,
      entityId,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error processing image upload:`, error);
    throw error;
  }
}

/**
 * Sube un archivo a Cloudinary
 * @param {Buffer} buffer - Buffer del archivo
 * @param {Object} options - Opciones de upload
 */
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    // Escribir el buffer al stream
    uploadStream.end(buffer);
  });
}

/**
 * Actualiza la URL de imagen en la entidad correspondiente
 * @param {string} entityType - Tipo de entidad ('case', 'homeless', 'user')
 * @param {string} entityId - ID de la entidad
 * @param {string} fieldName - Nombre del campo a actualizar
 * @param {string} imageUrl - URL de la imagen
 */
async function updateEntityImage(entityType, entityId, fieldName, imageUrl) {
  const updateData = { [fieldName]: imageUrl };
  
  switch (entityType) {
    case 'case':
      await prisma.case.update({
        where: { id: entityId },
        data: updateData,
      });
      break;
    
    // TODO: Uncomment when Homeless model is created in Task 4
    // case 'homeless':
    //   await prisma.homeless.update({
    //     where: { id: entityId },
    //     data: updateData,
    //   });
    //   break;
    
    case 'user':
      await prisma.user.update({
        where: { id: entityId },
        data: updateData,
      });
      break;
    
    case 'organization':
      await prisma.organization.update({
        where: { id: entityId },
        data: updateData,
      });
      break;
    
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Procesa un job de procesamiento de documento
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.fileBuffer - Buffer del archivo
 * @param {string} job.data.userId - ID del usuario
 * @param {string} job.data.documentType - Tipo de documento ('pdf', 'doc', etc.)
 * @param {string} job.data.entityType - Tipo de entidad
 * @param {string} job.data.entityId - ID de la entidad
 */
async function processDocumentJob(job) {
  const { fileBuffer, userId, documentType, entityType, entityId } = job.data;
  
  logger.info(`Processing document upload for ${entityType} ${entityId}`);
  
  try {
    // 1. Validar buffer
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }
    
    const buffer = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer, 'base64');
    
    // 2. Subir documento a Cloudinary (soporta PDFs y otros documentos)
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: `abrazar/documents/${entityType}s`,
      public_id: `${entityType}_${entityId}_${Date.now()}`,
      resource_type: 'raw', // Para documentos no-imagen
    });
    
    const documentUrl = uploadResult.secure_url;
    
    logger.info(`Document uploaded to Cloudinary: ${documentUrl}`);
    
    // 3. Guardar referencia en base de datos (si es necesario)
    // TODO: Crear modelo Document si se necesita tracking de documentos
    
    return {
      success: true,
      documentUrl,
      documentType,
      entityType,
      entityId,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error processing document upload:`, error);
    throw error;
  }
}

/**
 * Procesa un job de eliminación de archivo de Cloudinary
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.publicId - Public ID del archivo en Cloudinary
 * @param {string} job.data.resourceType - Tipo de recurso ('image', 'raw')
 */
async function processDeleteJob(job) {
  const { publicId, resourceType = 'image' } = job.data;
  
  logger.info(`Deleting file from Cloudinary: ${publicId}`);
  
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    
    logger.info(`File deleted from Cloudinary: ${publicId}`, result);
    
    return {
      success: true,
      publicId,
      result,
      deletedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error deleting file from Cloudinary:`, error);
    throw error;
  }
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

const uploadsWorker = new Worker(
  'uploads',
  async (job) => {
    switch (job.name) {
      case 'process-image':
        return await processImageJob(job);
      
      case 'process-document':
        return await processDocumentJob(job);
      
      case 'delete-file':
        return await processDeleteJob(job);
      
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisClient,
    concurrency: 2, // Procesar hasta 2 uploads simultáneamente
    limiter: {
      max: 20, // Máximo 20 uploads
      duration: 60000, // por minuto
    },
  }
);

// Event listeners
uploadsWorker.on('completed', (job) => {
  logger.info(`Uploads worker completed job ${job.id}`);
});

uploadsWorker.on('failed', (job, error) => {
  logger.error(`Uploads worker failed job ${job?.id}:`, error);
});

uploadsWorker.on('error', (error) => {
  logger.error('Uploads worker error:', error);
});

logger.info('Uploads worker initialized and ready');

// QueueEvents para escuchar eventos de la cola
const queueEvents = new QueueEvents('uploads', { connection: redisClient });

module.exports = {
  uploadsWorker,
  queueEvents,
  close: async () => {
    await uploadsWorker.close();
    await queueEvents.close();
  },
};
