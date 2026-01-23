import { useState, useCallback } from 'react';
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

import './PurchasePage.css';

const [, e] = bem('purchase-page');

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface CreditPack {
  id: string;
  price: number;
  credits: number;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: '1', price: 1, credits: 100 },
  { id: '5', price: 5, credits: 200 },
  { id: '10', price: 10, credits: 500 },
  { id: '20', price: 20, credits: 1500 },
];

type PageState = 'default' | 'loading' | 'success' | 'error';

export const PurchasePage: FC = () => {
  const initDataState = useSignal(initData.state);
  
  const [pageState, setPageState] = useState<PageState>('default');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);

  const chatId = initDataState?.user?.id?.toString() || '';

  const handlePurchase = useCallback(async (pack: CreditPack) => {
    if (!chatId) {
      setErrorMessage('Unable to identify user. Please restart the app from Telegram.');
      setPageState('error');
      return;
    }

    setSelectedPack(pack);
    setPageState('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/credits/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_chat_id: chatId,
          credits: pack.credits
        })
      });

      if (response.ok) {
        setPageState('success');
      } else {
        throw new Error('Failed to grant credits');
      }
    } catch (error) {
      setErrorMessage('Failed to add credits. Please try again.');
      setPageState('error');
    }
  }, [chatId]);

  const handleRetry = useCallback(() => {
    setPageState('default');
    setErrorMessage('');
    setSelectedPack(null);
  }, []);

  if (pageState === 'loading') {
    return (
      <Page back={false}>
        <Placeholder
          className={e('placeholder')}
          header="Adding Credits"
          description={
            <Text>
              Please wait...
            </Text>
          }
        >
          <Spinner size="l" className={e('spinner')} />
        </Placeholder>
      </Page>
    );
  }

  if (pageState === 'success') {
    const creditsAmount = selectedPack?.credits;
    return (
      <Page back={false}>
        <Placeholder
          className={e('placeholder')}
          header="Credits Added!"
          description={
            <>
              <Text>
                {creditsAmount} credits have been added to your account.
              </Text>
              <Text className={e('return-text')}>
                Return to the bot to start using your credits.
              </Text>
            </>
          }
        />
      </Page>
    );
  }

  if (pageState === 'error') {
    return (
      <Page back={false}>
        <Placeholder
          className={e('placeholder')}
          header="Failed"
          description={
            <>
              <Text className={e('error-text')}>
                {errorMessage}
              </Text>
              <Button
                className={e('retry-button')}
                onClick={handleRetry}
              >
                Try Again
              </Button>
            </>
          }
        />
      </Page>
    );
  }

  return (
    <Page back={false}>
      <List>
        <Section header="Get Free Credits">
          {CREDIT_PACKS.map((pack) => (
            <Cell
              key={pack.id}
              className={e('pack-cell')}
              subtitle={`${pack.credits} credits`}
              after={
                <Button
                  size="s"
                  onClick={() => handlePurchase(pack)}
                >
                  Get
                </Button>
              }
            >
              {pack.credits} Credits Pack
            </Cell>
          ))}
        </Section>
        <Section footer="Credits will be added to your account immediately.">
          <Cell className={e('info-cell')}>
            Select a pack above to add credits
          </Cell>
        </Section>
      </List>
    </Page>
  );
};
