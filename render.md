Problema: Mi backend NestJS desplegado en Render muestra en los logs:
"WARN [FirebaseService] ⚠️ GOOGLE_APPLICATION_CREDENTIALS no está definida. Login social deshabilitado."
Y al intentar login social desde la app Flutter, el endpoint /auth/social-login responde "Autenticación social no disponible".

Ya he configurado en Render la variable de entorno SERVICE_ACCOUNT_JSON que contiene el JSON completo de la cuenta de servicio de Firebase (en una sola línea, sin saltos). El código actual de firebase.service.ts no está inicializando Firebase Admin con esa variable.

**Tarea:** Modifica el archivo `src/firebase/firebase.service.ts` para que:
1. Intente primero leer la variable de entorno `SERVICE_ACCOUNT_JSON`. Si existe, parsea el contenido como JSON y usa `admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })`.
2. Si `SERVICE_ACCOUNT_JSON` no existe, entonces busca `GOOGLE_APPLICATION_CREDENTIALS`. Si existe, úsala como ruta de archivo con `admin.credential.applicationDefault()` (solo si la ruta termina en ".json" o existe realmente, pero para simplificar, asume que si está presente es una ruta válida).
3. Si ninguna variable está configurada, emite una advertencia clara y deja `initialized = false`.
4. Asegura que `admin.initializeApp` solo se llame una vez (verifica con `admin.apps.length === 0`).
5. En el método `verifyIdToken`, si `initialized` es `false`, lanza una excepción con un mensaje descriptivo.

**Importante:** Después de modificar el archivo, indícame los pasos para compilar y subir el cambio a Render (commit, push, y si es necesario forzar un nuevo deploy). También pide que reinicie el servicio en Render y verifique los logs para confirmar que ahora aparece el mensaje: "✅ Firebase Admin inicializado con SERVICE_ACCOUNT_JSON".

El archivo actual tiene una lógica con `admin.apps.length` y `applicationDefault()`, pero no está funcionando. Asegúrate de que el nuevo código maneje correctamente el string JSON sin intentar abrirlo como archivo.

estos son mi valores de mi variables de entorno: OPCIONAL
VALORES DE CONEXION SUPABASE:
Contraseña de la base de datos supabase: Ningun_sistema_es_seguro1
URL de transaction pool: postgresql://postgres.pnwjqmlewivhzbhvdrek:[YOUR-PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres
			postgresql://postgres.pnwjqmlewivhzbhvdrek:[YOUR-PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres
=================================================================
VALORES DE CONEXION REDIS:
Redis Host EndPoint: funky-muskox-39259.upstash.io
REDIS_PORT:	Port	6379
REDIS_PASSWORD: Token AZlbAAIgcDExNTBkNmE4ZjEyNjM0NTFhOWY5OTY1Y2VhYzczZDRhZA
REDIS_TLS	TLS/SSL: Enabled	true
=================================================================
VALORES DE CONEXION CLOUDFLARE
Access Key ID: 2b8c1ab623fa9ee4edab69702ea9ccdb
Secret Access Key: 607632ba3800a647d5f9050e257770531d9cf04accff5330ab4b270ce0925149
EndPoint S3: https://c96e8eb5b0dae0eaa32756cb7f7622db.r2.cloudflarestorage.com
=================================================================
VALORES DE CONEXIÓN RESEND
API KEY: re_gUr11Hng_7j3p6FxGtgckFeCwGNkhuya1
=================================================================
Guardar las credenciales del keystore en lugar seguro:

Contraseña: OficioApp2025!
Alias:      release
Archivo:    android/app/release-key.jks
Para compilar con tu URL final:

cd mobile
flutter build apk --release --dart-define=API_BASE_URL=https://tu-app.onrender.com
# o con dominio propio:
flutter build apk --release --dart-define=API_BASE_URL=https://api.tudominio.com
ombre de Alias: release
Fecha de Creación: 25 abr. 2026
Tipo de Entrada: PrivateKeyEntry
Longitud de la Cadena de Certificado: 1
Certificado[1]:
Propietario: CN=OficioApp, OU=Mobile, O=ConfiServ, L=Huancayo, ST=Junin, C=PE
Emisor: CN=OficioApp, OU=Mobile, O=ConfiServ, L=Huancayo, ST=Junin, C=PE
Número de serie: dab9e7f9f89ef0fa
Válido desde: Sat Apr 25 10:39:29 PET 2026 hasta: Wed Sep 10 10:39:29 PET 2053
Huellas digitales del certificado:
         SHA1: 5F:E3:DE:E5:77:66:5D:39:6D:AA:AE:01:B8:08:7D:09:D6:90:B1:0E
         SHA256: 1B:CB:AD:B0:91:B4:13:D1:B8:E6:87:FB:B6:C7:0F:C9:0D:F7:53:CD:23:5C:72:1F:D8:6A:0F:C5:13:25:25:60
Nombre del algoritmo de firma: SHA256withRSA
Algoritmo de clave pública de asunto: Clave RSA de 2048 bits
Versión: 3

Extensiones: 

#1: ObjectId: 2.5.29.14 Criticality=false
SubjectKeyIdentifier [
KeyIdentifier [
0000: EF BA A8 BB C1 FD 62 69   20 54 C0 56 A3 92 AE 5C  ......bi T.V...\
0010: 02 1C 7C 7C                                        ....
]
]