const {
  getConfigurationStatus,
  buildTemplateMessage,
  generateWaMeLink,
  sendWhatsAppMessage,
  formatPhoneNumber
} = require('../services/whatsappService');
const AuditLog = require('../models/AuditLog');

// @desc    Get WhatsApp API configuration status
// @route   GET /api/whatsapp/status
// @access  Private (Staff, Manager, Admin, Superadmin)
const getStatus = async (req, res, next) => {
  try {
    const status = getConfigurationStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview WhatsApp template message text and fallback link
// @route   POST /api/whatsapp/preview
// @access  Private
const previewTemplate = async (req, res, next) => {
  try {
    const { phone, template = 'custom', data = {}, customText } = req.body;
    const formattedPhone = formatPhoneNumber(phone);
    const messageText = customText || buildTemplateMessage(template, data);
    const waMeUrl = generateWaMeLink(formattedPhone, messageText);

    res.json({
      success: true,
      recipient: formattedPhone,
      template,
      messageText,
      waMeUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send WhatsApp message (Meta Cloud API with graceful wa.me fallback)
// @route   POST /api/whatsapp/send
// @access  Private (Staff, Manager, Admin, Superadmin)
const sendMessage = async (req, res, next) => {
  try {
    const { phone, template = 'custom', data = {}, customText = '' } = req.body;

    if (!phone) {
      res.status(400);
      throw new Error('Recipient phone number is required for WhatsApp dispatch');
    }

    const result = await sendWhatsAppMessage({ phone, template, data, customText });

    // Record action in AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'WHATSAPP_MESSAGE_TRIGGERED',
      entity: 'WhatsApp',
      entityId: result.recipient,
      details: {
        mode: result.mode,
        template,
        status: result.status || 'ATTEMPTED',
        recipient: result.recipient
      }
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  previewTemplate,
  sendMessage
};
