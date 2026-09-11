// Development seed script: writes fictional sample incidents demonstrating every SLA state.
// Run with: npm run seed (from /server) or npm run seed (from repo root)
// Existing data is preserved unless --force is passed.
import { readJsonFile, writeJsonFile } from './fileStore.js';
import { buildHistoryEntry } from './historyUtils.js';

const FORCE = process.argv.includes('--force');

function isoOffsetHours(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function seed() {
  const existing = await readJsonFile('incidents.json', []);
  if (existing.length > 0 && !FORCE) {
    console.log(
      `Skipped seeding: incidents.json already has ${existing.length} record(s). Re-run with --force to overwrite.`
    );
    return;
  }

  const incidents = [
    {
      incidentId: 'INC-1001',
      title: 'Checkout API returning HTTP 500 errors',
      description: 'Customers report failed checkouts. Error logs show ERR-500 responses from the payments gateway.',
      severity: 'P1',
      status: 'OPEN',
      owner: 'Asha Kapoor',
      impactedService: 'checkout-service',
      createdAt: isoOffsetHours(3), // P1 target 2h -> already breached
      updatedAt: isoOffsetHours(3),
      history: [buildHistoryEntry({ type: 'INCIDENT_CREATED', message: 'Incident created.' })]
    },
    {
      incidentId: 'INC-1002',
      title: 'Search results delayed for large catalogs',
      description: 'Search API latency increased for catalogs over 10k items. No error codes reported.',
      severity: 'P2',
      status: 'INVESTIGATING',
      owner: 'Miguel Santos',
      impactedService: 'search-service',
      createdAt: isoOffsetHours(3.2), // P2 target 4h -> 80% elapsed, approaching
      updatedAt: isoOffsetHours(1),
      history: [
        buildHistoryEntry({ type: 'INCIDENT_CREATED', message: 'Incident created.' }),
        buildHistoryEntry({
          type: 'STATUS_UPDATED',
          message: 'Status changed from OPEN to INVESTIGATING',
          previousValue: 'OPEN',
          newValue: 'INVESTIGATING'
        })
      ]
    },
    {
      incidentId: 'INC-1003',
      title: 'Notification emails sent with outdated template',
      description: 'Marketing noticed the shipment-confirmation template is a week out of date. Low customer impact.',
      severity: 'P3',
      status: 'OPEN',
      owner: 'Priya Nair',
      impactedService: 'notification-service',
      createdAt: isoOffsetHours(1), // P3 target 8h -> well within
      updatedAt: isoOffsetHours(1),
      history: [buildHistoryEntry({ type: 'INCIDENT_CREATED', message: 'Incident created.' })]
    },
    {
      incidentId: 'INC-1004',
      title: 'Login page intermittently unavailable',
      description: 'Auth service pods restarted repeatedly overnight. Root cause traced to a memory leak, resolved.',
      severity: 'P2',
      status: 'CLOSED',
      owner: 'Daniel Osei',
      impactedService: 'auth-service',
      createdAt: isoOffsetHours(30),
      updatedAt: isoOffsetHours(20),
      history: [
        buildHistoryEntry({ type: 'INCIDENT_CREATED', message: 'Incident created.' }),
        buildHistoryEntry({
          type: 'STATUS_UPDATED',
          message: 'Status changed from OPEN to INVESTIGATING',
          previousValue: 'OPEN',
          newValue: 'INVESTIGATING'
        }),
        buildHistoryEntry({
          type: 'STATUS_UPDATED',
          message: 'Status changed from INVESTIGATING to MITIGATED',
          previousValue: 'INVESTIGATING',
          newValue: 'MITIGATED'
        }),
        buildHistoryEntry({
          type: 'STATUS_UPDATED',
          message: 'Status changed from MITIGATED to CLOSED',
          previousValue: 'MITIGATED',
          newValue: 'CLOSED'
        })
      ]
    },
    {
      incidentId: 'INC-1005',
      title: 'Inventory sync mismatch for warehouse region EU-2',
      description: 'Reconciliation job ERR-409 conflicts observed. Mitigation applied, monitoring for recurrence.',
      severity: 'P1',
      status: 'MITIGATED',
      owner: 'Asha Kapoor',
      impactedService: 'inventory-service',
      createdAt: isoOffsetHours(1.5),
      updatedAt: isoOffsetHours(0.5),
      history: [
        buildHistoryEntry({ type: 'INCIDENT_CREATED', message: 'Incident created.' }),
        buildHistoryEntry({
          type: 'STATUS_UPDATED',
          message: 'Status changed from OPEN to INVESTIGATING',
          previousValue: 'OPEN',
          newValue: 'INVESTIGATING'
        }),
        buildHistoryEntry({
          type: 'STATUS_UPDATED',
          message: 'Status changed from INVESTIGATING to MITIGATED',
          previousValue: 'INVESTIGATING',
          newValue: 'MITIGATED'
        })
      ]
    }
  ];

  await writeJsonFile('incidents.json', incidents);
  await writeJsonFile('rcas.json', []);
  await writeJsonFile('links.json', []);

  console.log(`Seeded ${incidents.length} fictional incidents (incidents.json), plus empty rcas.json and links.json.`);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
});
