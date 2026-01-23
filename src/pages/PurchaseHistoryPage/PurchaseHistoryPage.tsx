import type { FC } from 'react';
import {
  Placeholder,
  Text,
} from '@telegram-apps/telegram-ui';

import { Page } from '@/components/Page.tsx';
import { bem } from '@/css/bem.ts';

import './PurchaseHistoryPage.css';

const [, e] = bem('purchase-history-page');

export const PurchaseHistoryPage: FC = () => {
  return (
    <Page back={true}>
      <Placeholder
        className={e('placeholder')}
        header="Credits History"
        description={
          <Text>
            Credits are now free! No purchase history to display.
          </Text>
        }
      />
    </Page>
  );
};
