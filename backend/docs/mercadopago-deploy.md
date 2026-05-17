# MercadoPago — Checklist de deploy a producción

Tras la auditoría del 2026-05-17 (commits `801c29b` → `f9f4e66`),
estos son los pasos OBLIGATORIOS antes de aceptar pagos reales.

## 1. Variables de entorno en Render

| Variable | Valor para PRODUCCIÓN |
|---|---|
| `NODE_ENV` | `production` |
| `API_BASE_URL` | `https://servi-api.onrender.com` (o el dominio público real) |
| `WEB_BASE_URL` | `https://www.oficioapp.org.pe` |
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-...` (NO `TEST-`) |
| `MERCADOPAGO_PUBLIC_KEY` | `APP_USR-...` |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret real desde MP dashboard (ver paso 2) |

⚠️ Si `API_BASE_URL` apunta a una IP local (`192.168.x.x`), **MP nunca
puede entregar webhooks**. Los pagos quedan huérfanos en MP y los
usuarios pagan sin recibir el plan.

## 2. Webhook secret en MercadoPago

1. https://www.mercadopago.com.pe/developers/panel/notifications/webhooks
2. Crear webhook apuntando a `https://servi-api.onrender.com/payments/mercadopago/webhook`.
3. Activar eventos: **Pagos** (`payment.created`, `payment.updated`).
4. **Configurar firma** → copiar el secret generado a `MERCADOPAGO_WEBHOOK_SECRET`.
5. El backend rechaza con `200 OK` silencioso si la firma falla — verificar
   logs de Render tras el primer pago de prueba para confirmar
   `🛑 Webhook con firma inválida` no aparece.

## 3. Migraciones aplicadas

```bash
cd backend && npx prisma migrate deploy
```

Migraciones relevantes a este flujo (orden):
- `20260517140000_strings_to_enums` (incluye `PaymentMethod` enum).
- `20260517160000_triggers_part4` (audit log de suscripciones).
- `20260517180000_payment_reference_unique` (idempotencia de webhooks).

## 4. Test end-to-end pre-go-live

1. Con `NODE_ENV=development` + token `TEST-`:
   - Crear preferencia desde Flutter → debe abrir checkout MP.
   - Pagar con [tarjeta de prueba](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/additional-content/test-cards) APRO.
   - Verificar en logs: `✅ Pago aprobado` + `✅ Suscripción activada`.
   - Confirmar en BD: `subscriptions.plan` cambió + nueva fila en `payments`
     con `reference` = paymentId.
2. Test de idempotencia: re-enviar el mismo webhook desde MP dashboard
   (Webhook → Test) — debe loggear `ya procesado — skip`, NO duplicar
   payment ni renovar endDate.
3. Test de monto: con curl manipular preference creando una de S/0.01
   y pagar → en logs debe aparecer `💸 Monto sospechoso` y la
   suscripción NO debe activarse.

## 5. Reconciliación manual de pagos huérfanos

Si MP confirma un pago pero el webhook falló (`activateSubscriptionFromPayment`
lanzó excepción), el log de Render mostrará:

```
Error procesando webhook payment=XXXX: ...
```

Procedimiento de recuperación:
1. Buscar el `payment_id` en logs.
2. Verificar en MP dashboard que el pago está aprobado.
3. Endpoint admin para reconciliar manualmente (TODO — pendiente para
   próxima pasada).
4. Mientras tanto, ejecutar manualmente vía SQL:
   ```sql
   -- Confirmar que no hay row aún
   SELECT * FROM payments WHERE reference = '<payment_id>';
   -- Si vacío: activar manualmente desde admin panel (que llame al
   -- PaymentsService.activateSubscriptionFromPayment con los datos
   -- del pago obtenidos de la API de MP).
   ```

## 6. Rate limits

- `POST /payments/mercadopago/create-preference`: 5/min por user.
- `POST /payments/mercadopago/webhook`: 60/min por IP.

Si MP empieza a recibir 429 en sus retries, aumentar el límite del
webhook en `mercadopago.controller.ts`.

## 7. Monitoring sugerido

- Sentry/CloudWatch alert en: `Error procesando webhook payment=` (log level error).
- Sentry alert en: `🛑 Webhook con firma inválida` (posible ataque o secret mal
  configurado).
- Sentry alert en: `💸 Monto sospechoso` (intento de fraude o bug del cliente).
