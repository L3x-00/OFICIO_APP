OBSERVACIONES DE QA: Flujos de Aprobación, Estados de Usuario y Bugs UI
1. Panel de Administración: Gestión de Verificaciones

Nueva sección de Verificación: Cuando un usuario registra un nuevo perfil de Profesional o Negocio, la solicitud debe entrar a un estado estricto de "Verificación".

Acciones del Dashboard: En el panel, el administrador debe tener tres botones claros para cada solicitud: "Aceptar", "Rechazar" y "Pedir más información".

Modal de Detalles: Al revisar la solicitud, el administrador debe poder abrir un modal que muestre todos los datos que el usuario llenó en el formulario de registro para poder evaluarlos.

2. Lógica de Negocio: Protección del Rol y Periodo de Gracia

Bloqueo de beneficios (Bug Crítico): Mientras un usuario no sea verificado y "Aceptado", debe mantener estrictamente el rol de "Cliente" en la base de datos y en la interfaz. No se le debe activar el flujo de proveedor ni otorgar el tiempo de gracia "gratis" prematuramente.

Fallo de cambio de estado: Actualmente existe un error grave: cuando el administrador presiona el botón "Rechazar", el sistema automáticamente cambia el rol del usuario a "Proveedor". Esto es incorrecto y debe corregirse de inmediato; un usuario rechazado sigue siendo Cliente.

3. Interfaz Móvil (App): Notificaciones y UI de Rechazo

Notificación de Rechazo: Si el administrador rechaza la solicitud, el usuario debe recibir una notificación push/in-app alertándole de la decisión.

Cambio visual en el Perfil: En el perfil del usuario, el recuadro que dice "Esperando la aprobación..." (que está en color verde) debe reaccionar al rechazo. Si es rechazado, el recuadro debe cambiar a color rojo con el mensaje: "Su perfil profesional ha sido rechazado. Intente nuevamente más tarde".

Feedback al Usuario: Al hacer clic en ese recuadro rojo, debe abrirse un modal que le muestre al usuario los motivos exactos del rechazo que el administrador redactó desde el panel.

4. Bug Frontend (Panel Admin en React): Claves Duplicadas

Error de renderizado (Duplicate keys): En la vista de lista/tabla, React arroja un error de claves duplicadas (ej. key="77") al intentar renderizar las filas (<tr>).

Causa y Solución: Esto ocurre en el renderRow al expandir las categorías, ya que una subcategoría está recibiendo el mismo id que su categoría padre, o hay datos duplicados en la base de datos. Se debe asegurar que cada fila genere un key único (por ejemplo, combinando el ID del padre con el del hijo si es necesario) para solucionar el error de renderizado en el DOM.