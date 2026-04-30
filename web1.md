La página web de OficioApp (carpeta `web/`) no muestra el panel de proveedor a los usuarios que ya han creado su perfil de profesional o negocio. Todos son redirigidos a `/cliente` aunque tengan un perfil de proveedor activo.

Causa raíz: La función `getRedirectPath` en `web/lib/auth.ts` solo verifica `user.role`. Pero el backend devuelve `role: "USUARIO"` incluso para usuarios que ya tienen perfil de proveedor (el rol solo cambia a PROVEEDOR cuando el admin aprueba el perfil). La app Flutter sí muestra el panel correcto porque consulta `GET /users/my-provider-status` para saber si el usuario tiene perfiles de proveedor.

Solución requerida:
1. Después del login exitoso en `web/app/login/page.tsx`, llama adicionalmente a `GET /users/my-provider-status` usando el token JWT recién obtenido.
2. Si la respuesta indica que el usuario tiene perfiles de proveedor (`hasProvider: true`), redirige a `/panel` en lugar de a `/cliente`.
3. Si la respuesta indica que el usuario tiene rol `ADMIN`, NO rediriges internamente. En su lugar, redirige al panel de administración desplegado en Vercel: `https://oficioadmin.vercel.app/login`. Para mayor comodidad, pasa el email del usuario como parámetro en la URL (ej. `https://oficioadmin.vercel.app/login?email=admin@oficio.com`) y, si es posible, autocompleta el campo de email en el formulario de login del panel admin leyendo ese query param.
4. Modifica `getRedirectPath` en `web/lib/auth.ts` para que acepte un parámetro opcional `hasProvider: boolean` y redirija a `/panel` si es true.
5. Alternativamente, crea una función `getRedirectPathFromProviderStatus` que tome la respuesta de `my-provider-status` y decida la ruta final.

Para el panel admin (`admin/`), modifica `admin/app/login/page.tsx` para que:
- Lea el query param `email` de la URL (usando `useSearchParams` de Next.js).
- Si el parámetro `email` está presente, autocompleta automáticamente el campo de email en el formulario de login.
- El campo de contraseña permanece vacío para que el admin la ingrese manualmente.

También verifica que el endpoint `GET /users/my-provider-status` esté accesible desde la web con el token JWT (agrega el header Authorization).

No modifiques el backend. Solo la lógica de redirección en la web y la lectura de query params en el admin.