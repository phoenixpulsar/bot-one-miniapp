import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import {
  Button,
  Cell,
  List,
  Placeholder,
  Section,
  Spinner,
  Text,
} from '@telegram-apps/telegram-ui';
import { initData, useSignal } from '@tma.js/sdk-react';

import { Page } from '@/components/Page.tsx';
import { bem } from '@/css/bem.ts';
import { getPaymentHistory, PaymentHistoryItem } from '@/services/paymentService.ts';

import './PurchaseHistoryPage.css';

const [, e] = bem('purchase-history-page');

export const PurchaseHistoryPage: FC = () => {
  const initDataState = useSignal(initData.state);
  const chatId = initDataState?.user?.id?.toString() || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!chatId) {
      setError('Unable to identify user. Please restart the app from Telegram.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getPaymentHistory(chatId);
      setPayments(response.payments);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment history';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateTxHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  if (loading) {
    return (
      <Page back={true}>
        <Placeholder
          className={e('placeholder')}
          header="Loading History"
          description={
            <Text>
              Fetching your payment history...
            </Text>
          }
        >
          <Spinner size="l" className={e('spinner')} />
        </Placeholder>
      </Page>
    );
  }

  if (error) {
    return (
      <Page back={true}>
        <Placeholder
          className={e('placeholder')}
          header="Unable to Load History"
          description={
            <div className={e('error-content')}>
              <Text className={e('error-text')}>
                We couldn't load your purchase history right now. This might be a temporary issue.
              </Text>
              <Button
                className={e('retry-button')}
                onClick={fetchHistory}
              >
                Try Again
              </Button>
            </div>
          }
        />
      </Page>
    );
  }

  if (payments.length === 0) {
    return (
      <Page back={true}>
        <Placeholder
          className={e('placeholder')}
          header="No Purchases Yet"
          description={
            <Text>
              You haven't made any purchases yet. Go to the purchase page to buy credits.
            </Text>
          }
        />
      </Page>
    );
  }

  return (
    <Page back={true}>
      <List>
        <Section header="Purchase History">
          {payments.map((payment, index) => (
            <Cell
              key={`${payment.tx_hash}-${index}`}
              className={e('payment-cell')}
              subtitle={
                <div className={e('payment-details')}>
                  <span className={e('payment-date')}>{formatDate(payment.created_at)}</span>
                  <span className={e('payment-tx')}>TX: {truncateTxHash(payment.tx_hash)}</span>
                </div>
              }
              after={
                <div className={e('payment-amount')}>
                  <span className={e('credits')}>+{payment.credits_granted}</span>
                  <span className={e('ton')}>{payment.amount_ton} TON</span>
                </div>
              }
            >
              <div className={e('payment-status', { completed: payment.status === 'completed' })}>
                {payment.status === 'completed' ? 'Completed' : payment.status}
              </div>
            </Cell>
          ))}
        </Section>
      </List>
    </Page>
  );
};
