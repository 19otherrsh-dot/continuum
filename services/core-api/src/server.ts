import { buildApp } from './app.js';
import { assertConfig, config } from './config.js';
import { disconnect } from './db/client.js';

async function main(): Promise<void> {
  assertConfig();

  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    await app.close();
    await disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(
    `Continuum API on :${config.port} — providers=${config.providerMode}, ai=${
      config.ai.enabled ? 'claude' : 'local-fallback'
    }`,
  );
}

main().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
