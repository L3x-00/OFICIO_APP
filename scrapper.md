Informe técnico breve
Sistema local: [provider-leads](/D:/servi-marketing-provider-leads/tools/provider-leads). Ejecuta FastAPI + Python 3.9 aislado con uv; interfaz en http://127.0.0.1:8765.
Estado actual:
37 distritos: 28 de Huancayo y 9 de Chupaca.
40 categorías base de negocio.
Base local actual: 44 leads, 1 revisado, 1 categoría faltante, 2 con consentimiento marcado.
Extracción piloto:
Consulta Google Maps por categoría + distrito.
Máximo 5 consultas por lote y 20 resultados por consulta.
Navegador Chromium visible. Sin CAPTCHA, rotación IP ni ocultamiento.
Datos extraídos: nombre, dirección, categoría visible, teléfono público, web, enlace Maps, puntuación, número de reseñas, horario, descripción y opciones de tienda/retiro/delivery.
No extrae: correo, WhatsApp, fotos, credenciales, datos del propietario ni consentimiento.
Flujo de datos:
Busca resultados y guarda cada ejecución.
Deduplica por fuente + nombre normalizado + dirección.
Clasifica contra categorías NEGOCIO.
Categorías no reconocidas pasan a propuesta manual.
Operador marca estado: pendiente, contactar, contactado, rechazado o convertido.
Exporta CSV y SQL manual.
Almacenamiento y SQL:
Base local: data/leads.sqlite3, no versionada.
SQL staging: [provider_leads_staging.sql](/C:/Users/Usuario/oficio_app-provider-leads/backend/prisma/sql/provider_leads_staging.sql).
El SQL exportado crea/actualiza staging de leads y propuestas de categorías.
No crea User, Provider, credenciales ni publicación pública.
No se conecta ni ejecuta nada en Supabase automáticamente.
Mensajería:
Esta versión no envía correos, WhatsApp ni llamadas.
El teléfono público queda como dato de revisión; consentimiento se registra manualmente desde el panel.
Dependencia operativa:
Requiere Chromium de Playwright instalado.
Los selectores de Google Maps pueden cambiar y hacer fallar campos o resultados.