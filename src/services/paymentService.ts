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

export interface RetryPaymentRequest {
  telegram_chat_id: string;
  tx_hash: string;
}

export interface RetryPaymentResponse {
  success: boolean;
  credits_granted: number;
  new_balance: number;
  already_completed?: boolean;
  error?: string;
  retry?: boolean;
}

export interface PaymentStatusResponse {
  status: string;
  credits_granted: number;
  amount_ton: string;
  created_at: string;
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
    throw new Error(errorData.error || `Payment confirmation failed: ${response.status}`);
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

export async function retryPaymentVerification(data: RetryPaymentRequest): Promise<RetryPaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payments/retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json().catch(() => ({}));

  if (response.status === 202) {
    return {
      success: false,
      credits_granted: 0,
      new_balance: 0,
      retry: true,
      error: responseData.error || 'Transaction not yet visible on blockchain',
    };
  }

  if (!response.ok) {
    throw new Error(responseData.error || `Payment retry failed: ${response.status}`);
  }

  return responseData;
}

export async function getPaymentStatus(telegram_chat_id: string, tx_hash: string): Promise<PaymentStatusResponse | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/status?telegram_chat_id=${encodeURIComponent(telegram_chat_id)}&tx_hash=${encodeURIComponent(tx_hash)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get payment status: ${response.status}`);
  }

  return response.json();
}
