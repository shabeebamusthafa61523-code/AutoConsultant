import API from './api';

export const whatsappService = {
  // Get WhatsApp configuration status
  getStatus: () => API.get('/whatsapp/status'),

  // Preview message text and wa.me fallback link
  previewMessage: (data) => API.post('/whatsapp/preview', data),

  // Send message through backend (Meta Cloud API or returns fallback wa.me URL)
  sendMessage: (data) => API.post('/whatsapp/send', data),

  // Open direct wa.me link in browser
  openDirectWhatsApp: (phone, text) => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = '91' + digits;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(text || '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export default whatsappService;
