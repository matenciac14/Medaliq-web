import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sample 100% of errors in beta, reduce later
  sampleRate: 1.0,

  // Performance: sample 20% of transactions
  tracesSampleRate: 0.2,

  // Replay: capture 0% of sessions, 100% of errors
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],
});
