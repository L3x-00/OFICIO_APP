TAREA 10: Función Estética para Planes Premium/Estándar

Funcionalidad:
- Tarjeta de proveedor se ve diferente si tiene plan Premium o Estándar
- Plan Gratis → diseño normal
- Plan Estándar → badge "Estándar", color diferente, border destacado
- Plan Premium → badge "Premium", color dorado/premium, diseño especial

Frontend:
- ServiceCard recibe subscription data
- Mostrar badge con plan en esquina superior
- Si Premium:
  - Border color dorado o destacado
  - Fondo con gradiente sutil
  - Badge con estrella o "Premium"
  - Texto "Servicio Premium" si es necesario
- Si Estándar:
  - Border azul o color primario
  - Badge "Verificado - Estándar"
- Si Gratis:
  - Diseño normal sin badge especial

Backend:
- GET /providers ya retorna subscriptionPlan (verificar que incluya)
- POST /providers debe guardar subscriptionPlan correctamente
- GET /providers/:id debe retornar subscriptionPlan

Mobile:
- Actualizar service_card.dart para recibir subscriptionPlan
- Agregar lógica de color/diseño según plan
- Usar AppColors (colores del sistema) para premium/estándar

Colores sugeridos:
- Premium: dorado/amarillo (#FFD700 o similar)
- Estándar: azul primario
- Gratis: gris neutral

Archivos a tocar:
- mobile/lib/features/providers_list/presentation/widgets/service_card.dart
- mobile/lib/core/constants/app_colors.dart (agregar colores premium si no existen)
- mobile/lib/features/provider_dashboard/domain/models/provider_model.dart (verificar subscriptionPlan)

Resuelve directamente.