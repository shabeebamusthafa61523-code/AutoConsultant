const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: {
      type: String,
      default: 'System'
    },
    userRole: {
      type: String,
      default: 'Staff'
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entity: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      default: '',
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });

// Helper to record audit log cleanly
auditLogSchema.statics.logAction = async function ({ user, action, entity, entityId, details, req }) {
  try {
    const logData = {
      user: user?._id || user?.id || null,
      userName: user?.name || user?.username || 'System',
      userRole: user?.role || 'Staff',
      action,
      entity,
      entityId: entityId ? String(entityId) : '',
      details: details || {},
      ipAddress: req?.ip || req?.connection?.remoteAddress || '',
      timestamp: new Date()
    };
    return await this.create(logData);
  } catch (err) {
    console.error('AuditLog creation error (non-fatal):', err.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
