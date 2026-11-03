/**
 * Commit/rollback of canonical rows through the service-role import RPCs (#271). Rows go to a staging
 * table in chunks; import_finalize writes them in one transaction, so a failure imports nothing.
 * The salt never leaves this process; the database only sees salted hashes of external IDs.
 */
import { createHash } from 'node:crypto';
import type { CanonicalAggregate, CanonicalResponse } from './canonical.ts';
import type { MappingProfile } from './mapping.ts';
import type { ImportReport } from './report.ts';

/** Calls a Postgres function with named arguments and returns its JSON result. */
export type ImportRpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;

export const externalKeyHash = (salt: string, sourceId: string, externalId: string) =>
  createHash('sha256').update(`${salt}:${sourceId}:${externalId}`).digest('hex');

export const fileSha256 = (content: Buffer | string) => createHash('sha256').update(content).digest('hex');

export interface CommitInput {
  sourceId: string;
  profile: MappingProfile;
  rows: CanonicalResponse[] | CanonicalAggregate[];
  report: ImportReport;
  fileHash: string;
  importer: string;
  /** Required for response imports: at least 16 characters, kept outside the repo. */
  salt?: string;
  chunkSize?: number;
}

export interface CommitResult {
  runId: string;
  inserted: number;
  skipped: number;
}

export async function commitImport(rpc: ImportRpc, input: CommitInput): Promise<CommitResult> {
  const granularity = input.profile.granularity === 'aggregate' ? 'aggregate' : 'response';
  if (granularity === 'response' && (!input.salt || input.salt.length < 16))
    throw new Error('MOODMAP_IMPORT_SALT fehlt oder ist kürzer als 16 Zeichen');
  if (input.report.critical.length) throw new Error('Kritische Fehler im Dry-Run – Import abgebrochen');
  const errors = Object.fromEntries(Object.entries(input.report.errors).map(([code, e]) => [code, e.count]));
  const runId = (await rpc('import_begin', {
    meta: {
      sourceId: input.sourceId,
      granularity,
      fileSha256: input.fileHash,
      mappingId: input.profile.id,
      mappingVersion: input.profile.version,
      rowsTotal: input.report.totalRows,
      rowsAccepted: input.report.accepted,
      rowsRejected: input.report.rejected,
      errors,
      importer: input.importer,
    },
  })) as string;
  try {
    const payload = input.rows.map((row) => {
      if ('externalId' in row) {
        // The external ID itself is not sent, only its salted hash (PRIVACY §9.2).
        const { externalId, row: rowNo, ...rest } = row;
        return { rowNo, externalKeyHash: externalKeyHash(input.salt!, input.sourceId, externalId), ...rest };
      }
      const { row: rowNo, ...rest } = row;
      return { rowNo, ...rest };
    });
    const size = input.chunkSize ?? 500;
    for (let offset = 0; offset < payload.length; offset += size) {
      await rpc('import_stage', { run_id: runId, rows: payload.slice(offset, offset + size) });
    }
    const result = (await rpc('import_finalize', { run_id: runId })) as CommitResult;
    return { runId, inserted: result.inserted, skipped: result.skipped };
  } catch (error) {
    await rpc('import_abort', { run_id: runId }).catch(() => undefined);
    throw error;
  }
}

/** PostgREST RPC client with the service-role key (never in the frontend). */
export function supabaseImportRpc(url: string, serviceKey: string): ImportRpc {
  return async (fn, args) => {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${fn}: HTTP ${response.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  };
}
