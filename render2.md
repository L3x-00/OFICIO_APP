muy bien calude, funciona el tema de registro con correo y asi como el boton de google. pero tengo estas observaciones:

Al inicar mi app y registrarme como provedor, no me cargaj las categorias y eso se puede ver en mi base de datos de supabase, a pesar de ejecutar el seed, no se crearon todo como tenia que suceder, ademas quiero que añdas una accion visual, cuando el usuario se registra con el boton de "continuar con google" y este es aceptado tiene que aparecer un modal de "registro completo", al igual que cuando ponme el codigo de verificaion  seguir el flujo de seleecion de rol y el modal de bienvemnida,al inicar con el boton de "continuar con google" se muestra el modal de eleccion de cuentas y al seleccionas se oculta, compeltar el rol el flujo se congela y ahi nomas queda
este es el valor de mi varialbe database URL:
postgresql://postgres.pnwjqmlewivhzbhvdrek:Ningun_sistema_es_seguro1@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true
que conecta a supabase


[Nest] 72  - 04/26/2026, 10:55:38 PM   DEBUG [SISTEMA_DIAGNOSTICO] Stack: Invalid `prisma.provider.create()` invocation:
Menu
[Nest] 72  - 04/26/2026, 10:55:38 PM   ERROR [SISTEMA_DIAGNOSTICO] ❌ FALLO DETECTADO en POST /auth/register/provider
[Nest] 72  - 04/26/2026, 10:55:38 PM   ERROR [SISTEMA_DIAGNOSTICO] Dato enviado por el móvil: {"businessName":"presiente","phone":"930759515","type":"OFICIO","dni":"67676767","description":"verdad de zapstos"}
[Nest] 72  - 04/26/2026, 10:55:38 PM   ERROR [SISTEMA_DIAGNOSTICO] Mensaje del error: 
Invalid `prisma.provider.create()` invocation:
Foreign key constraint violated on the constraint: `providers_localityId_fkey`
[Nest] 72  - 04/26/2026, 10:55:38 PM   ERROR [PrismaExceptionFilter] Prisma [P2003]: 
Invalid `prisma.provider.create()` invocation:
Foreign key constraint violated on the constraint: `providers_localityId_fkey`