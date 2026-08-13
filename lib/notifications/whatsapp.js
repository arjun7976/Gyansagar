// Generic WhatsApp notification service
// This is a provider-agnostic architecture ready for future WhatsApp API integration
// Currently returns a mock response - no actual API calls in Phase 7

export async function sendWhatsAppMessage({ to, message }) {
  // Check if WhatsApp is configured
  if (!isWhatsAppConfigured()) {
    console.log("WhatsApp not configured. Message would be sent to:", to);
    console.log("Message:", message);
    // Return success for now (no actual sending in Phase 7)
    return { success: true, mock: true };
  }

  // Future: Implement actual provider integration here
  // Example for Twilio, MessageBird, etc.
  try {
    // Placeholder for actual API call
    // const response = await fetch(process.env.WHATSAPP_API_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     to: to,
    //     message: message,
    //     phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
    //   })
    // });
    
    console.log("WhatsApp message would be sent to:", to);
    return { success: true, mock: true };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    throw error;
  }
}

export function isWhatsAppConfigured() {
  return !!(process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
}
