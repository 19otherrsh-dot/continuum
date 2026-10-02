import { INGESTION_TICK_MS } from '@continuum/shared';
import { assertConfig, config } from './config.js';
import { disconnect } from './db/client.js';
import { countStalledEnrichment, runEnrichmentTick } from './ingestion/enrichment-worker.js';
import {
  recordCaptureCoverage,
  runIngestionTick,
  runStallingSweep,
} from './ingestion/scheduler.js';

/**
 * Capture worker.
 *
 * Runs as its own process so a provider that hangs or rate-limits can never
 * consume the API's request capacity. It shares the database client and domain
 * modules with the API — the separation is operational, not architectural.
 */

const STALLING_SWEEP_MS = 5 * 60_000;
const ENRICHMENT_BUSY_MS = 250;
const ENRICHMENT_IDLE_MS = 3_000;

const log = (message: string, extra?: Record<string, unknown>): void => {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] worker: ${message}${extra ? ` ${JSON.stringify(extra)}` : ''}`);
};

const logger = {
  info: (obj: unknown, msg?: string) => log(msg ?? 'info', obj as Record<string, unknown>),
  error: (obj: unknown, msg?: string) => log(msg ?? 'error', obj as Record<string, unknown>),
};

let stopping = false;

async function ingestionLoop(): Promise<void> {
  while (!stopping) {
    try {
      const { polled, outcomes } = await runIngestionTick(logger);
      if (polled > 0) {
        const totals = outcomes.reduce(
          (acc, o) => ({
            created: acc.created + o.created,
            updated: acc.updated + o.updated,
            duplicates: acc.duplicates + o.duplicates,
            filtered: acc.filtered + o.filtered,
            excluded: acc.excluded + o.excluded,
          }),
          { created: 0, updated: 0, duplicates: 0, filtered: 0, excluded: 0 },
        );
        if (Object.values(totals).some((v) => v > 0)) {
          log(`polled ${polled} connection(s)`, { ...totals });
        }
      }
    } catch (error) {
      log('ingestion tick failed', { error: String(error) });
    }
    await sleep(INGESTION_TICK_MS);
  }
}

/**
 * Drains the summarization queue independently of ingestion, so a slow model
 * never holds a connection poll open.
 */
async function enrichmentLoop(): Promise<void> {
  let idleStreak = 0;

  while (!stopping) {
    try {
      const outcome = await runEnrichmentTick(logger);
      if (outcome.claimed > 0) {
        idleStreak = 0;
        log(
          `enriched ${outcome.succeeded}/${outcome.claimed}` +
            (outcome.failed > 0 ? ` (${outcome.failed} failed)` : ''),
        );
      } else {
        idleStreak += 1;
      }

      if (idleStreak > 0 && idleStreak % 60 === 0) {
        const stalled = await countStalledEnrichment();
        if (stalled > 0) log(`${stalled} activity summaries still pending after 10 minutes`);
      }
    } catch (error) {
      log('enrichment tick failed', { error: String(error) });
    }

    // Poll quickly while there is work, and back off when idle so an empty
    // queue is not a busy loop.
    await sleep(idleStreak > 0 ? ENRICHMENT_IDLE_MS : ENRICHMENT_BUSY_MS);
  }
}

async function stallingLoop(): Promise<void> {
  while (!stopping) {
    try {
      const flagged = await runStallingSweep();
      if (flagged > 0) log(`flagged ${flagged} stalling deal(s)`);

      // Weekly per workspace; the function no-ops if one was recorded recently.
      const sampled = await recordCaptureCoverage();
      if (sampled > 0) log(`recorded capture coverage for ${sampled} workspace(s)`);
    } catch (error) {
      log('stalling sweep failed', { error: String(error) });
    }
    await sleep(STALLING_SWEEP_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  assertConfig();
  log(
    `started — providers=${config.providerMode}, ai=${config.ai.enabled ? 'claude' : 'local-fallback'}`,
  );

  const shutdown = async (signal: string) => {
    log(`shutting down (${signal})`);
    stopping = true;
    await disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await Promise.all([ingestionLoop(), enrichmentLoop(), stallingLoop()]);
}

main().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
