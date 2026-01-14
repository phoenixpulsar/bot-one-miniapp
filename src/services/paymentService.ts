export interface PaymentConfirmation {
  telegram_chat_id: string;
  tx_hash: string;
  amount_ton: string;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function confirmPayment(data: PaymentConfirmation): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Payment confirmation failed: ${response.status}`);
  }

  return response.json();
}
