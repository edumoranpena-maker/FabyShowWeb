// ============================================================================
// Registro del webhook de Telegram — script de línea de comandos, NO un
// endpoint HTTP. Un endpoint que registre el webhook sería una superficie
// de ataque innecesaria (cualquiera podría reapuntar el bot); este script
// se corre a mano, una sola vez, con las credenciales que ya tienes en tu
// propio entorno.
//
// Uso:
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... \
//     node server/telegram/setWebhook.js https://tu-dominio.vercel.app/api/telegram
//
// O, si ya tienes un .env.local con esas variables:
//   node --env-file=.env.local server/telegram/setWebhook.js https://tu-dominio.vercel.app/api/telegram
//
// También puedes consultar el estado actual sin registrar nada:
//   node server/telegram/setWebhook.js --status
// ============================================================================

import { setWebhook, getWebhookInfo } from './telegramClient.js'
import { getTelegramWebhookSecret } from '../lib/env.js'

async function main() {
  const arg = process.argv[2]

  if (!arg || arg === '--status') {
    const info = await getWebhookInfo()
    console.log('Estado actual del webhook de Telegram:')
    console.log(JSON.stringify(info, null, 2))
    return
  }

  const url = arg
  if (!/^https:\/\//.test(url)) {
    throw new Error('La URL del webhook debe empezar con https:// (Telegram lo exige).')
  }

  const secret = getTelegramWebhookSecret()
  if (!secret) {
    throw new Error('Falta TELEGRAM_WEBHOOK_SECRET en el entorno donde corres este script.')
  }

  const result = await setWebhook(url, secret)
  console.log('Webhook registrado:', result)
}

main().catch((err) => {
  console.error('Error registrando el webhook:', err.message)
  process.exit(1)
})
