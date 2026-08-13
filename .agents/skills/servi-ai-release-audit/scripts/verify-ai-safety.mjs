import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../../..');
const required = [
  'servi.md',
  'backend/src/ai-assistant/servi-platform-knowledge.ts',
  'backend/src/whatsapp-assistant/whatsapp-assistant.config.ts',
  'backend/src/whatsapp-assistant/whatsapp-assistant.service.ts',
  'backend/src/ai-assistant/tools/tool-registry.ts',
];

const failures = [];
for (const relative of required) {
  if (!existsSync(resolve(root, relative))) failures.push(`Falta ${relative}`);
}

function source(relative) {
  return readFileSync(resolve(root, relative), 'utf8');
}

if (failures.length === 0) {
  const knowledge = source('backend/src/ai-assistant/servi-platform-knowledge.ts');
  const config = source('backend/src/whatsapp-assistant/whatsapp-assistant.config.ts');
  const assistant = source('backend/src/whatsapp-assistant/whatsapp-assistant.service.ts');
  const tools = source('backend/src/ai-assistant/tools/tool-registry.ts');

  for (const url of ['https://oficioapp.org.pe', 'https://play.google.com/store/apps/details?id=com.oficioapp.mobile']) {
    if (!knowledge.includes(url)) failures.push(`Falta enlace canónico: ${url}`);
  }
  for (const flag of [
    "WHATSAPP_ASSISTANT_ENABLED', false",
    "WHATSAPP_ASSISTANT_AI_ENABLED', false",
    "WHATSAPP_ASSISTANT_LINK_ENABLED', false",
    "WHATSAPP_ASSISTANT_OPERATIONS_ENABLED', false",
  ]) {
    if (!config.includes(flag)) failures.push(`Default seguro ausente: ${flag}`);
  }
  for (const guard of ['verifyOpenWaSignature', 'message.received', 'data.fromMe !== false', 'decision.aiEligible']) {
    if (!assistant.includes(guard)) failures.push(`Guarda WhatsApp ausente: ${guard}`);
  }
  if (!tools.includes('search_providers') || !tools.includes('search_categories')) {
    failures.push('Allowlist pública incompleta');
  }
}

if (failures.length > 0) {
  console.error('AI audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('AI audit passed: knowledge curated, flags safe, webhook guards present.');
