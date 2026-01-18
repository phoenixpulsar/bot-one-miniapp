export interface PaymentConfirmation {
  telegram_chat_id: string;
  tx_hash: string;
  amount_ton: string;
  sender_address: string;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
}

export interface PaymentHistoryItem {
  tx_hash: string;
  amount_ton: string;
  credits_granted: number;
  status: string;
  created_at: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
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

export async function getPaymentHistory(telegram_chat_id: string): Promise<PaymentHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payments/history?telegram_chat_id=${encodeURIComponent(telegram_chat_id)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch payment history: ${response.status}`);
  }

  return response.json();
}
