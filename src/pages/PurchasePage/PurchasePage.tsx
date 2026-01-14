import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonConnectButton } from '@tonconnect/ui-react';
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
import { confirmPayment } from '@/services/paymentService.ts';

import './PurchasePage.css';

const [, e] = bem('purchase-page');

interface CreditPack {
  id: string;
  price: number;
  credits: number;
  tonAmount: string;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: '5', price: 5, credits: 200, tonAmount: '1000000000' },
  { id: '10', price: 10, credits: 500, tonAmount: '2000000000' },
  { id: '20', price: 20, credits: 1500, tonAmount: '4000000000' },
];

const RECIPIENT_WALLET_ADDRESS = 'UQBvW8Z5huBkMJYdnfAEM5JqTNLuuBrj3PiZ_NqcG5IIpSIs';

type PageState = 'default' | 'loading' | 'success' | 'error';

export const PurchasePage: FC = () => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
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
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: RECIPIENT_WALLET_ADDRESS,
            amount: pack.tonAmount,
            payload: btoa(JSON.stringify({
              telegram_chat_id: chatId,
              pack: pack.id,
            })),
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      
      await confirmPayment({
        telegram_chat_id: chatId,
        tx_hash: result.boc,
        amount_ton: pack.tonAmount,
      });

      setPageState('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setErrorMessage(message);
      setPageState('error');
    }
  }, [chatId, tonConnectUI]);

  const handleRetry = useCallback(() => {
    setPageState('default');
    setErrorMessage('');
    setSelectedPack(null);
  }, []);

  const handleDisconnect = useCallback(async () => {
    await tonConnectUI.disconnect();
  }, [tonConnectUI]);

  if (!wallet) {
    return (
      <Page back={false}>
        <div className={e('landing')}>
          <div className={e('landing-content')}>
            <div className={e('hero-icon')}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="40" fill="url(#gradient1)"/>
                <path d="M25 35L40 25L55 35V50L40 60L25 50V35Z" stroke="white" strokeWidth="2.5" fill="none"/>
                <path d="M40 25V60M25 35L55 50M55 35L25 50" stroke="white" strokeWidth="2" strokeOpacity="0.6"/>
                <defs>
                  <linearGradient id="gradient1" x1="0" y1="0" x2="80" y2="80">
                    <stop stopColor="#0098EA"/>
                    <stop offset="1" stopColor="#0057B8"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <h1 className={e('hero-title')}>Unlock AI Document Power</h1>
            <p className={e('hero-subtitle')}>
              Transform your documents with cutting-edge AI. Fast, secure, and powered by TON blockchain.
            </p>
            
            <div className={e('features')}>
              <div className={e('feature')}>
                <span className={e('feature-icon')}>&#9889;</span>
                <div className={e('feature-text')}>
                  <strong>Lightning Fast</strong>
                  <span>Process documents in seconds</span>
                </div>
              </div>
              <div className={e('feature')}>
                <span className={e('feature-icon')}>&#128274;</span>
                <div className={e('feature-text')}>
                  <strong>Secure Payments</strong>
                  <span>TON blockchain protection</span>
                </div>
              </div>
              <div className={e('feature')}>
                <span className={e('feature-icon')}>&#10024;</span>
                <div className={e('feature-text')}>
                  <strong>AI-Powered</strong>
                  <span>Smart document analysis</span>
                </div>
              </div>
            </div>
            
            <div className={e('cta-section')}>
              <Text className={e('cta-text')}>
                Connect your wallet to get started
              </Text>
              <TonConnectButton className={e('cta-button')} />
            </div>
            
            <p className={e('trust-badge')}>
              Trusted by thousands of users worldwide
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (pageState === 'loading') {
    return (
      <Page back={false}>
        <Placeholder
          className={e('placeholder')}
          header="Processing Payment"
          description={
            <Text>
              Please confirm the transaction in your wallet...
            </Text>
          }
        >
          <Spinner size="l" className={e('spinner')} />
        </Placeholder>
      </Page>
    );
  }

  if (pageState === 'success') {
    return (
      <Page back={false}>
        <Placeholder
          className={e('placeholder')}
          header="Payment Successful!"
          description={
            <>
              <Text>
                {selectedPack?.credits} credits have been added to your account.
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
          header="Payment Failed"
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
        <Section header="Purchase Credits">
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
                  ${pack.price}
                </Button>
              }
            >
              ${pack.price} Pack
            </Cell>
          ))}
        </Section>
        <Section footer="Payments are processed via TON blockchain. Credits will be available immediately after confirmation.">
          <Cell
            className={e('wallet-cell')}
            subtitle={wallet.account.address.slice(0, 8) + '...' + wallet.account.address.slice(-6)}
            after={
              <Button
                size="s"
                mode="outline"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            }
          >
            Connected Wallet
          </Cell>
        </Section>
      </List>
    </Page>
  );
};
