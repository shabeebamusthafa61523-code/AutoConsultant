/**
 * Centralized WhatsApp Service for BENZ Auto Consultant CRM
 * Supports official Meta Cloud API (Graph API) with graceful fallback to wa.me URLs.
 * Never exposes credentials to frontend; masks secrets in logs and diagnostic outputs.
 */

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

/**
 * Format Indian / international phone numbers into E.164 without '+' or leading zeros
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = `91${digits}`; // Default to India (+91)
  }
  return digits;
};

/**
 * Mask sensitive credentials for logging and status output
 */
const maskSecret = (secret) => {
  if (!secret || secret.length < 8) return '****';
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
};

/**
 * Check if official Meta Cloud API credentials are configured
 */
const isConfigured = () => {
  return Boolean(
    WHATSAPP_API_TOKEN &&
    WHATSAPP_PHONE_NUMBER_ID &&
    WHATSAPP_API_TOKEN !== 'placeholder' &&
    WHATSAPP_PHONE_NUMBER_ID !== 'placeholder'
  );
};

/**
 * Returns configuration diagnostics without leaking tokens
 */
const getConfigurationStatus = () => {
  const configured = isConfigured();
  return {
    configured,
    status: configured ? 'READY' : 'CONFIGURATION REQUIRED',
    provider: 'Meta Cloud API (WhatsApp Business Platform)',
    apiVersion: WHATSAPP_API_VERSION,
    hasToken: Boolean(WHATSAPP_API_TOKEN),
    maskedToken: WHATSAPP_API_TOKEN ? maskSecret(WHATSAPP_API_TOKEN) : 'NOT_SET',
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID || 'NOT_SET',
    fallbackAvailable: true,
    message: configured
      ? 'Official Meta Cloud API is active and ready for dispatch.'
      : 'Meta Cloud API credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) not configured in environment. Graceful wa.me link generation remains active.'
  };
};

/**
 * Build message text based on standard BENZ CRM templates
 */
const buildTemplateMessage = (templateName, data = {}) => {
  const candName = data.candidateName || data.name || 'Candidate';

  switch (templateName) {
    case 'payment_reminder':
    case 'payment':
      return `Dear ${candName}, this is a reminder from BENZ Auto Consultant regarding your pending balance of ₹${data.balance || 0}. Kindly clear the balance at your earliest convenience. Thank you!`;

    case 'receipt':
      return `Dear ${candName}, your payment of ₹${data.amount || 0} has been successfully recorded at BENZ Auto Consultant (Receipt No: ${data.receiptNumber || 'N/A'}, Mode: ${data.paymentMode || 'Cash'}). Remaining Balance: ₹${data.balance || 0}. Thank you!`;

    case 'test_reminder':
    case 'test':
      return `Dear ${candName}, your Driving Test is scheduled for ${data.testDate || 'scheduled date'}. Please arrive on time at the RTO test ground with your original documents. Best wishes from BENZ Driving School!`;

    case 'class_schedule':
    case 'class':
      return `Dear ${candName}, your driving training session has been scheduled for ${data.sessionDate || 'upcoming slot'} (${data.timeSlot || 'General Slot'}). Please confirm availability with your instructor (${data.instructor || 'Office Desk'}). - BENZ Driving School`;

    case 'document_reminder':
    case 'documents':
      return `Dear ${candName}, please submit your pending documents (${data.missingDocs || 'Aadhaar / Photo / Medical Certificate'}) at the BENZ Auto Consultant office to continue your RTO processing.`;

    case 'licence_ready':
    case 'licence':
      return `Dear ${candName}, Congratulations! Your Driving Licence is ready for collection at the BENZ Auto Consultant office. Please bring your original LL / token.`;

    case 'custom':
    default:
      return data.message || `Message from BENZ Auto Consultant for ${candName}.`;
  }
};

/**
 * Generate a direct WhatsApp Web / App link as a fallback
 */
const generateWaMeLink = (phone, text) => {
  const formatted = formatPhoneNumber(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
};

/**
 * Centralized method to send WhatsApp message
 * Tries Meta Cloud API if configured; otherwise gracefully returns preformatted fallback link.
 */
const sendWhatsAppMessage = async ({ phone, template = 'custom', data = {}, customText = '' }) => {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    throw new Error('Invalid recipient phone number provided for WhatsApp dispatch');
  }

  const messageText = customText || buildTemplateMessage(template, data);
  const waMeFallbackUrl = generateWaMeLink(formattedPhone, messageText);

  // If Meta API credentials are not set, return graceful fallback
  if (!isConfigured()) {
    return {
      success: true,
      mode: 'WA_ME_FALLBACK',
      status: 'CONFIGURATION REQUIRED',
      provider: 'WhatsApp Direct URL (wa.me)',
      recipient: formattedPhone,
      messageText,
      waMeFallbackUrl,
      note: 'External Meta Cloud API not configured; fallback URL prepared for instant client dispatch.'
    };
  }

  // Official Meta Cloud API dispatch
  const endpoint = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Meta WhatsApp API dispatch error:', responseData?.error?.message || responseData);
      return {
        success: false,
        mode: 'META_API_FAILED',
        error: responseData?.error?.message || 'Meta WhatsApp dispatch failed',
        recipient: formattedPhone,
        messageText,
        waMeFallbackUrl
      };
    }

    return {
      success: true,
      mode: 'META_CLOUD_API',
      status: 'SENT',
      messageId: responseData?.messages?.[0]?.id || null,
      recipient: formattedPhone,
      messageText,
      waMeFallbackUrl
    };
  } catch (err) {
    console.error('WhatsApp service network exception:', err.message);
    return {
      success: false,
      mode: 'NETWORK_ERROR',
      error: err.message,
      recipient: formattedPhone,
      messageText,
      waMeFallbackUrl
    };
  }
};

module.exports = {
  formatPhoneNumber,
  getConfigurationStatus,
  buildTemplateMessage,
  generateWaMeLink,
  sendWhatsAppMessage,
  isConfigured
};
