import { execSync } from 'node:child_process';

function auditJson() {
  try {
    return execSync('npm audit --omit=dev --json', { stdio: 'pipe' }).toString('utf8');
  } catch (e) {
    // npm returns non-zero when vulnerabilities exist; still prints JSON.
    return (e.stdout || '').toString('utf8');
  }
}

const raw = auditJson();
if (!raw) {
  console.log('npm audit produced no output');
  process.exit(0);
}

const data = JSON.parse(raw);
const v = data?.metadata?.vulnerabilities || {};
const critical = v.critical || 0;
const high = v.high || 0;

console.log(`audit: critical=${critical} high=${high} moderate=${v.moderate||0} low=${v.low||0}`);
if (critical > 0) {
  console.error('BLOCK: critical vulnerabilities present.');
  process.exit(1);
}
