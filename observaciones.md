Lista de Correcciones y Mejoras de Funcionalidad - ConfiServ
1. Control de Límites en Registro de Proveedores
Observación: En el flujo de "Quiero ser parte" (join_us_modal) para roles de Profesional o Negocio, el formulario permite subir hasta 4 fotos con el Plan Gratis.

Corrección: Se debe aplicar estrictamente la limitación de 3 fotos para el Plan Gratis. Esta validación debe funcionar tanto en el modal de "unirse" como en el flujo de registro inicial de la aplicación.

2. Optimización de Interfaz en Registro de Negocio
Observación: La sección de "Horario de Atención" en el formulario de registro de negocio satura la vista del usuario.

Corrección: Implementar un componente desglosable (tipo ExpansionTile o Dropdown) para que el horario permanezca oculto por defecto y el usuario solo lo despliegue cuando necesite editarlo.

3. Visibilidad y Gestión de Subastas (Service Requests)
Observación: Las subastas deben tener una lógica de visibilidad global pero participación restringida.

Corrección: * Cualquier proveedor debe poder ver las subastas publicadas, pero solo aquellos que cumplan con los requisitos establecidos pueden postularse.

El perfil del cliente debe incluir un nuevo apartado llamado "Mis solicitudes" para que pueda gestionar y visualizar el estado de sus subastas activas.

4. Estandarización de Planes y Precios
Observación: Existen inconsistencias en los nombres y cantidad de fotos de los planes en plan_selector_sheet.dart.

Corrección: * Plan Gratis: 3 fotos y panel limitado (es el plan por defecto).

Plan Estándar: 6 fotos.

Plan Premium: 10 fotos.

Acción: Eliminar la opción "Básico" del selector y reemplazarla visualmente por la información del plan "Gratis". El selector solo debe permitir la compra de "Estándar" y "Premium".

5. Flujo de Upgrade desde Ajustes
Observación: Los botones de "Subir de rango" en panel_settings_tab no están vinculados al flujo de pago.

Corrección: Al presionar los botones de upgrade (Estándar o Premium), se debe disparar el modal plan_selector_sheet y permitir al usuario completar el flujo de pago íntegro hasta la validación de Yape.

6. Consistencia Global de Nomenclatura
Corrección: Unificar en todos los archivos del proyecto (Frontend y Backend) los nombres de los niveles de suscripción. Los únicos términos permitidos deben ser: "Gratis", "Estándar" y "Premium".

7. Corrección en Carga de Comprobante (Yape)
Observación: En el modal yape_payment_screen, el botón "Enviar comprobante" se queda en estado de carga (loading) infinito y no procesa la subida.

Corrección: Depurar el servicio de subida de archivos y el endpoint correspondiente para asegurar que el comprobante se registre y el flujo avance a la pantalla de confirmación.