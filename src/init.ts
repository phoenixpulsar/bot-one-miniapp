import {
  setDebug,
  themeParams,
  initData,
  viewport,
  init as initSDK,
  mockTelegramEnv,
  retrieveLaunchParams,
  emitEvent,
  miniApp,
  backButton,
} from '@tma.js/sdk-react';

/**
 * Initializes the application and configures its dependencies.
 */
export async function init(options: {
  debug: boolean;
  eruda: boolean;
  mockForMacOS: boolean;
}): Promise<void> {
  // Set @telegram-apps/sdk-react debug mode and initialize it.
  setDebug(options.debug);
  initSDK();

  // Add Eruda if needed.
  options.eruda && void import('eruda').then(({ default: eruda }) => {
    eruda.init();
    eruda.position({ x: window.innerWidth - 50, y: 0 });
  });

  // Telegram for macOS has a ton of bugs, including cases, when the client doesn't
  // even response to the "web_app_request_theme" method. It also generates an incorrect
  // event for the "web_app_request_safe_area" method.
  if (options.mockForMacOS) {
  let firstThemeSent = false;

  mockTelegramEnv({
    onEvent(event, next) {
      if (event.name === 'web_app_request_theme') {
        // Use `any` here because we’re bridging two different representations
        // of theme params (SDK state vs Telegram raw payload).
        let tp: any;

        if (firstThemeSent) {
          // After the first request, reuse current theme from the SDK.
          tp = themeParams.state();
        } else {
          firstThemeSent = true;
          // On the first request, try to use Telegram launch params.
          // Fall back to current state if for some reason they are missing.
          tp = retrieveLaunchParams().tgWebAppThemeParams ?? themeParams.state();
        }

        return emitEvent('theme_changed', { theme_params: tp as any });
      }

      if (event.name === 'web_app_request_safe_area') {
        return emitEvent('safe_area_changed', {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        });
      }

      next();
    },
  });
}

  // Mount all components used in the project.
  backButton.mount.ifAvailable();
  initData.restore();

  if (miniApp.mount.isAvailable()) {
    themeParams.mount();
    miniApp.mount();
    themeParams.bindCssVars();
  }

  if (viewport.mount.isAvailable()) {
    viewport.mount().then(() => {
      viewport.bindCssVars();
    });
  }
}