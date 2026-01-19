import { useState, useCallback, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
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
import { confirmPayment, retryPaymentVerification } from '@/services/paymentService.ts';

import './PurchasePage.css';

const [, e] = bem('purchase-page');

interface CreditPack {
  id: string;
  price: number;
  credits: number;
  tonAmount: string;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: '5', price: 5, credits: 200, tonAmount: '5000000000' },   // 5 TON
  { id: '10', price: 10, credits: 500, tonAmount: '10000000000' }, // 10 TON
  { id: '20', price: 20, credits: 1500, tonAmount: '20000000000' }, // 20 TON
];

const RECIPIENT_WALLET_ADDRESS = 'UQDI2zTol4URrXtiMhBdtDmDV8QwQ0w86iNMAK67jhbP8_ZE';

type PageState = 'default' | 'loading' | 'success' | 'error' | 'payment_sent_verification_failed';

interface FailedPaymentInfo {
  txHash: string;
  amount: number;
  credits: number;
}

const POLLING_INTERVAL_MS = 30000;
const MAX_POLLING_DURATION_MS = 5 * 60 * 1000;

export const PurchasePage: FC = () => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const initDataState = useSignal(initData.state);
  
  const [pageState, setPageState] = useState<PageState>('default');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [failedPaymentInfo, setFailedPaymentInfo] = useState<FailedPaymentInfo | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

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
    setFailedPaymentInfo(null);

    let txResult: { boc: string } | null = null;

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: RECIPIENT_WALLET_ADDRESS,
            amount: pack.tonAmount,
          },
        ],
      };

      txResult = await tonConnectUI.sendTransaction(transaction);
      
      await confirmPayment({
        telegram_chat_id: chatId,
        tx_hash: txResult.boc,
        amount_ton: pack.price.toString(),
        sender_address: wallet!.account.address,
      });

      setPageState('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      
      if (txResult) {
        setFailedPaymentInfo({
          txHash: txResult.boc,
          amount: pack.price,
          credits: pack.credits,
        });
        setErrorMessage(message);
        setPageState('payment_sent_verification_failed');
      } else {
        setErrorMessage(message);
        setPageState('error');
      }
    }
  }, [chatId, tonConnectUI]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingStartTimeRef.current = null;
    setPollingStatus('');
    setRetryCount(0);
  }, []);

  const handleRetry = useCallback(() => {
    stopPolling();
    setPageState('default');
    setErrorMessage('');
    setSelectedPack(null);
    setFailedPaymentInfo(null);
  }, [stopPolling]);

  const handleDisconnect = useCallback(async () => {
    stopPolling();
    await tonConnectUI.disconnect();
  }, [tonConnectUI, stopPolling]);

  useEffect(() => {
    if (pageState !== 'payment_sent_verification_failed' || !failedPaymentInfo || !chatId) {
      return;
    }

    pollingStartTimeRef.current = Date.now();
    setPollingStatus('Verifying payment...');

    const attemptRetry = async () => {
      const elapsedTime = Date.now() - (pollingStartTimeRef.current || Date.now());
      
      if (elapsedTime >= MAX_POLLING_DURATION_MS) {
        stopPolling();
        setPollingStatus('Verification timed out. Please contact support.');
        return;
      }

      try {
        setRetryCount(prev => prev + 1);
        const result = await retryPaymentVerification({
          telegram_chat_id: chatId,
          tx_hash: failedPaymentInfo.txHash,
        });

        if (result.success || result.already_completed) {
          stopPolling();
          setPageState('success');
          return;
        }

        if (result.retry) {
          const remainingTime = Math.ceil((MAX_POLLING_DURATION_MS - elapsedTime) / 1000);
          setPollingStatus(`Waiting for blockchain confirmation... (${remainingTime}s remaining)`);
        }
      } catch (error) {
        const remainingTime = Math.ceil((MAX_POLLING_DURATION_MS - elapsedTime) / 1000);
        setPollingStatus(`Retrying verification... (${remainingTime}s remaining)`);
      }
    };

    attemptRetry();

    pollingIntervalRef.current = setInterval(attemptRetry, POLLING_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, [pageState, failedPaymentInfo, chatId, stopPolling]);

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

  if (pageState === 'payment_sent_verification_failed' && failedPaymentInfo) {
    return (
      <Page back={false}>
        <Placeholder
          className={e('placeholder')}
          header="Payment Sent - Verifying"
          description={
            <>
              <Text className={e('warning-text')}>
                Your payment of {failedPaymentInfo.amount} TON was sent successfully.
              </Text>
              {pollingStatus ? (
                <>
                  <Spinner size="m" className={e('polling-spinner')} />
                  <Text className={e('polling-status')}>
                    {pollingStatus}
                  </Text>
                  {retryCount > 0 && (
                    <Text className={e('retry-count')}>
                      Verification attempts: {retryCount}
                    </Text>
                  )}
                </>
              ) : (
                <Text className={e('info-text')}>
                  Your {failedPaymentInfo.credits} credits will be added once verification completes.
                </Text>
              )}
              <Text className={e('tx-info')}>
                Transaction ID: {failedPaymentInfo.txHash.slice(0, 16)}...
              </Text>
              <Text className={e('support-text')}>
                If credits are not added within 5 minutes, please contact support with your transaction ID.
              </Text>
              <Button
                className={e('retry-button')}
                onClick={handleRetry}
              >
                Return to Purchase
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
          <Link to="/purchase-history" className={e('history-link')}>
            <Cell
              className={e('history-cell')}
              after={
                <span className={e('history-arrow')}>&#8250;</span>
              }
            >
              View Purchase History
            </Cell>
          </Link>
        </Section>
      </List>
    </Page>
  );
};
