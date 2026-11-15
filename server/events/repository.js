import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// This interface can be implemented with DynamoDB without changing routes or React.
export function createEventRepository({ catalogFile, dataDir }) {
  let writes = Promise.resolve();
  return {
    async list() {
      const events = JSON.parse(await fs.readFile(catalogFile, 'utf8'));
      if (!Array.isArray(events) || events.some(e => !e.id || !e.title || !['proposed', 'upcoming', 'completed'].includes(e.status) || (e.status === 'upcoming' && !Number.isFinite(Date.parse(e.startsAt))))) throw new Error('Invalid event catalog');
      return events;
    },
    saveRsvp(record) {
      const operation = writes.then(async () => {
        await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
        const file = path.join(dataDir, 'rsvps.json');
        let records = [];
        try { records = JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        // Retries for the same event/contact do not create duplicate registrations.
        if (records.some(r => r.eventId === record.eventId && r.email === record.email)) return;
        records.push(record);
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(temporary, JSON.stringify(records, null, 2), { mode: 0o600 });
          await fs.rename(temporary, file);
        } finally { await fs.rm(temporary, { force: true }); }
      });
      writes = operation.catch(() => {});
      return operation;
    },
  };
}
