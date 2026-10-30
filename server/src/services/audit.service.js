import { AuditLog } from '../models/index.js';

export async function logAudit({ user, action, entity, meta = {}, req = null }) {
  try {
    const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers['user-agent'] || '';

    await AuditLog.create({
      user: user || null,
      action,
      entity: {
        model: entity.model,
        id: entity.id,
      },
      meta,
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : '',
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error.message);
  }
}
