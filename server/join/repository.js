import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Single-process development adapter. A DynamoDB adapter can implement save(record)
// with a conditional put on submissionId, preserving the same retry semantics.
export function createJoinRepository(file) {
  let writes = Promise.resolve();
  return {
    save(record) {
      const operation = writes.then(async () => {
        await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
        let records = [];
        try { records = JSON.parse(await fs.readFile(file, 'utf8')); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (!Array.isArray(records)) throw new Error('Invalid submission store');
        const previous = records.find(r => r.submissionId === record.submissionId);
        if (previous) {
          const content = ({ submittedAt, consentAt, ...rest }) => JSON.stringify(rest);
          if (content(previous) !== content(record)) {
            const error = new Error('Submission key already used'); error.code = 'CONFLICT'; throw error;
          }
          return;
        }
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          const handle = await fs.open(temporary, 'wx', 0o600);
          try { await handle.writeFile(JSON.stringify([...records, record], null, 2)); await handle.sync(); }
          finally { await handle.close(); }
          await fs.rename(temporary, file);
        } finally { await fs.rm(temporary, { force: true }); }
      });
      writes = operation.catch(() => {});
      return operation;
    },
  };
}
