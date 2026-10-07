# Boletín — suscriptores, campañas y envío por el SMTP de cada tienda

Fecha: 2026-10-07. Parte 2b de la hoja de ruta. Rama `feature/newsletter`.

## Contexto

- Un despliegue por cliente: cada tienda tiene su propio Vercel, Sanity, Clerk y dominio.
- Ya existe:
  - el formulario del boletín en el pie de página (`components/NewsletterForm.tsx`, con casilla de consentimiento);
  - la acción pública `subscribe` (`actions/newsletter.ts`), que guarda un documento `subscriber.<hash>` con `email`, `consent`, `subscribedAt` y `source`. El id con punto lo deja fuera del API público de Sanity;
  - el esquema `subscriberType` (de solo lectura en Studio).
- Correos de pedidos: `lib/email.ts` usa nodemailer con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM_EMAIL`. Hoy `.env.local` no tiene esas variables, así que no sale ningún correo.
- Panel `/admin`:
  - las secciones y sus permisos están en `lib/permissions.ts` (`AdminSection`, `SECTION_PERMISSION`) y el menú en `components/admin/shell/nav.ts`;
  - cada página empieza con `requireSection`;
  - Ajustes (`app/(admin)/admin/ajustes/page.tsx`) tiene hoy solo la moneda.
- Datos de la tienda: `siteSettings.contact.address` (dirección), `storeName`, logo y paleta (`THEMES`). La moneda se da formato con `formatPrice`.
- La URL pública de la tienda está en `NEXT_PUBLIC_BASE_URL`.

## Objetivo

- El dueño de la tienda ve y maneja sus suscriptores: buscar, filtrar, agregar, importar, exportar y borrar.
- El dueño escribe una campaña con una plantilla fija y productos del catálogo. La prueba enviándosela a sí mismo y la envía a todos los suscriptores activos.
- Los correos salen por el SMTP de cada tienda, que se configura y se prueba desde el panel. Los correos de pedidos usan el mismo SMTP.
- Cada correo cumple CAN-SPAM y la Ley 1581: enlace de baja, baja en un clic, nombre y dirección de la tienda, y consentimiento registrado.

## Fuera de alcance

- Correos automáticos (bienvenida, productos nuevos, carrito abandonado).
- Bloques libres en la campaña (solo plantilla fija).
- Seguimiento de aperturas o clics.
- Programar el envío para una hora futura, o envío sin la página abierta (cron).
- Manejo automático de rebotes (marcar como inválido tras varios fallos).
- Segmentos (enviar a una parte de la lista).
- Doble confirmación al suscribirse.
- Textos del correo en inglés (parte 3, bilingüe).

## Permisos

- Nueva sección del panel `boletin` ("Boletín"), con el permiso `configurar` (superadmin y admin).
- La configuración del SMTP está en Ajustes, que ya pide `configurar`.
- Cada acción de servidor nueva vuelve a comprobar `requirePermission("configurar")`.
- La acción pública `subscribe` y la página de baja no piden sesión.

## Diseño

### 1. Datos (Sanity)

Todos los documentos nuevos llevan un id con punto, así que el API público no los lee. Se leen y escriben solo en el servidor con `backendClient`. `config.smtp`, `config.smtpUsage` y `campaign` no tienen esquema en Studio: se manejan solo desde el panel, y la contraseña cifrada no queda a la vista en Studio.

**Configuración del SMTP: `config.smtp`**

| Campo | Tipo | Regla |
|---|---|---|
| `host` | string | obligatorio, 1–200 |
| `port` | number | entero 1–65535; por defecto 587 |
| `security` | `none` \| `starttls` \| `ssl` | por defecto `starttls` (`ssl` para el puerto 465) |
| `user` | string | 0–200 |
| `password` | string | cifrada: `v1.` + base64url(iv \| texto cifrado \| tag) |
| `fromName` | string | 0–80; vacío usa `storeName` |
| `fromEmail` | string | correo válido, obligatorio |
| `replyTo` | string | correo válido u opcional |
| `dailyLimit` | number | entero 1–100000; por defecto 450 |

- **Cifrado de la contraseña:** AES-256-GCM con IV aleatorio de 12 bytes. La clave es el SHA-256 de la variable de entorno `EMAIL_ENCRYPTION_KEY`.
  - Sin esa variable, no se puede guardar una contraseña y el formulario lo dice.
  - Si el texto cifrado está alterado, el descifrado falla y nunca se usa a medias.
- **La contraseña nunca va al navegador.** El formulario recibe solo `hasPassword: boolean`. Si llega vacía al guardar, se conserva la anterior.
- **Sin `config.smtp`**, el transporte usa las variables `SMTP_*`, como hoy.

**Uso del día: `config.smtpUsage`**

- Guarda `{ date: "YYYY-MM-DD" (UTC), count }`. Si la fecha cambió, el conteo vuelve a 0.
- Suma cada correo enviado: campañas, pruebas y pedidos.
- Las campañas se detienen al llegar a `dailyLimit`. Los pedidos y las pruebas nunca se bloquean.

**Suscriptor: `subscriber.<hash>` (se amplía el existente)**

- Campos nuevos:
  - `status`: `active` o `unsubscribed`. Si falta, cuenta como `active`;
  - `unsubscribedAt`: datetime;
  - `source`: `footer`, `manual` o `import`.
- **Alta desde el pie de página:** si el correo existía dado de baja, vuelve a `active` con nueva fecha y nuevo consentimiento, porque lo pidió la propia persona. Hoy `createIfNotExists` no lo reactiva; pasa a crear el documento o reactivarlo.
- **Alta manual e importación:** nunca reactivan a un `unsubscribed` y nunca duplican un correo existente.
- **Borrar:** elimina el documento. Si la persona vuelve a suscribirse, entra como nueva.

**Campaña: `campaign.<uuid>`**

| Campo | Regla |
|---|---|
| `subject` | 1–150, obligatorio para enviar |
| `preheader` | 0–150 (texto de vista previa en la bandeja) |
| `image` | imagen opcional `{ assetId, url }`, como en Apariencia |
| `title` | 1–120, obligatorio para enviar |
| `text` | 0–3000; párrafos separados por línea en blanco |
| `button` | `{ label 0–30, href }`; `href` con la regla de enlaces de la tienda (vacío, `/…` sin `//`, o `https://`); un botón sin texto o sin enlace no se muestra |
| `products` | 0–6 referencias débiles a `product` |
| `status` | `draft` \| `sending` \| `paused` \| `sent` |
| `pauseReason` | `user` \| `limit` \| `smtp` (con `pauseMessage` en lenguaje simple) |
| `cursor` | `_id` del último suscriptor tomado |
| `total`, `sent`, `failed` | números |
| `failures` | últimos 50 `{ email, error }` |
| `startedAt`, `finishedAt`, `updatedAt` | datetime |

- Un borrador se guarda solo, como los formularios de Apariencia: `useAutosave` y la cola `draftSaves`.
- Una campaña `sending`, `paused` o `sent` no se edita. Se puede duplicar, y la copia es un borrador nuevo.
- Se puede borrar una campaña en borrador. Las enviadas quedan como historial.

### 2. Panel

**Ajustes → Correo** (debajo de la moneda)

- **Formulario:** servidor, puerto, seguridad, usuario, contraseña ("•••• guardada" si existe), nombre y correo del remitente, responder a, y tope diario.
- **Nota para Gmail:** usar una contraseña de aplicación; el tope de Gmail es de unos 500 correos al día.
- **Guardar:** valida en el navegador y en el servidor, con errores por campo.
- **"Enviarme un correo de prueba":** usa lo guardado. Primero hace `transporter.verify()` y después envía un correo simple al correo de la sesión de Clerk.
  - Muestra los pasos: "Conectado al servidor", "Sesión iniciada", "Correo enviado a …".
  - Si falla, da un mensaje simple según el error: no se pudo conectar (revisa servidor y puerto), usuario o contraseña incorrectos, el servidor rechazó al remitente, o se agotó el tiempo.
  - El texto técnico va en "Ver detalle". Nunca muestra la contraseña.

**Boletín (`/admin/boletin`)**, con las pestañas Suscriptores y Campañas.

*Suscriptores*

- Totales arriba: activos y dados de baja.
- Buscador por correo, filtro Todos / Activos / Dados de baja y tabla de 50 por página: correo, fecha, origen y estado.
- **Agregar:** campo de correo, más la casilla "Tengo permiso de esta persona para enviarle correos" (obligatoria). El origen queda `manual`.
- **Importar CSV:** se elige el archivo y el navegador lo lee.
  - Acepta separador `,` o `;`, comillas, BOM de Excel y una primera fila de encabezado opcional. La columna del correo es la que se llama `email`, `correo` o `e-mail`; si no hay encabezado, es la primera columna con forma de correo.
  - Muestra un resumen: N nuevos, N ya estaban, N omitidos por estar dados de baja, N inválidos (con los primeros 10 de ejemplo) y N repetidos en el archivo.
  - Pide la casilla de permiso y luego Importar. El origen queda `import`.
  - Máximo 5000 filas por archivo. El servidor vuelve a validar todo.
- **Exportar CSV:** `email,fecha,origen,estado` con BOM UTF-8, para que Excel muestre bien las tildes.
- **Borrar** (en cada fila): pide confirmar con "Se borran sus datos. Si vuelve a suscribirse entrará como nuevo".

*Campañas*

- Lista: asunto, estado (Borrador, Enviando, En pausa, Enviada), avance "120 de 812" y fecha. Botón "Nueva campaña".
- **Editor (`/admin/boletin/[id]`):**
  - A la izquierda, el formulario: asunto, texto de vista previa, imagen, título, texto, botón (texto y enlace) y productos, elegidos con un buscador del catálogo (hasta 6, ordenables con Subir/Bajar y con opción de quitar).
  - A la derecha, la vista previa del correo real en un `iframe srcDoc`, generada con la misma función que el envío, con un enlace de baja de ejemplo.
  - "Enviarme una prueba": la envía al correo de la sesión con el asunto "[Prueba] …". No cambia el estado ni el avance.
  - "Enviar a N suscriptores": pide confirmar en línea con "Se enviará a 812 suscriptores activos. Hoy quedan 450 envíos; el resto sigue mañana".
  - **No deja enviar** si falta el SMTP (ni `config.smtp` ni variables), si falta `contact.address`, si falta el asunto o el título, o si no hay suscriptores activos. En cada caso dice qué falta y dónde arreglarlo.
- **Mientras envía**, en la misma página:
  - barra "120 de 812", con enviados y fallidos;
  - el aviso "No cierres esta página: el envío sigue mientras esté abierta";
  - el botón Pausar.
- **Página cerrada a mitad del envío:** si se abre una campaña que quedó en `sending` sin pestaña enviando, el editor la muestra como en pausa, con "Continuar".
- **En pausa:** muestra el motivo y el botón "Continuar".
  - Por tope: "Llegaste al tope de hoy (450). Continúa mañana".
  - Por SMTP: el mensaje simple del error.
  - Por el usuario: "En pausa".
- **Enviada:** muestra el resumen, la lista de fallidos con su error, y "Duplicar".

### 3. Tienda

- El formulario del pie de página no cambia, salvo la reactivación descrita en §1.
- **`/boletin/baja?s=<subscriberId>&t=<firma>`:**
  - Muestra "¿Dejar de recibir correos de {tienda}?" y el botón "Darme de baja". El botón hace POST a una acción de servidor.
  - Al terminar dice "Listo, ya no recibirás correos de {tienda}".
  - Con una firma inválida dice "Este enlace no es válido".
  - Si la persona ya estaba dada de baja o el documento ya no existe, muestra el mismo "Listo", para no revelar si el correo estaba en la lista.
- **`POST /api/boletin/baja?s=…&t=…`:** baja en un clic (RFC 8058) para el botón de Gmail y Yahoo. Responde 200 sin cuerpo.
- **Firma:** HMAC-SHA256 de `subscriberId` con una clave derivada de `EMAIL_ENCRYPTION_KEY` (`"unsubscribe:" + clave`), en base64url. Se compara en tiempo constante.

### 4. Envío

**Transporte (`lib/mailer.ts`)**

- Arma el transporte de nodemailer desde `config.smtp` (descifrando la contraseña) o, si no existe, desde las variables `SMTP_*`.
- Tiempos máximos: `connectionTimeout` 10 s, `greetingTimeout` 10 s, `socketTimeout` 20 s.
- Se guarda en memoria por instancia y se vuelve a armar cuando cambia `config.smtp` (por `_rev`).
- `lib/email.ts` (pedidos) usa este transporte, y `sendEmail` suma al uso del día.

**Una tanda (`sendCampaignBatch(campaignId)`, acción de servidor)**

1. Comprueba `configurar`, que la campaña esté en `sending` y que el SMTP esté configurado.
2. Calcula `restante = dailyLimit − uso de hoy`. Si es 0, pasa la campaña a `paused` con `limit` y termina.
3. Toma hasta `min(20, restante)` suscriptores `active` con `_id > cursor`, en orden de `_id`. Si no hay, pasa la campaña a `sent` con `finishedAt` y termina.
4. **Reserva la tanda:** mueve `cursor` al último `_id` tomado con `patch(...).ifRevisionId(rev)`. Si Sanity responde conflicto, vuelve a leer la campaña:
   - si ya no está en `sending` (por ejemplo, se pausó), devuelve ese estado;
   - si sigue en `sending`, responde "Otra pestaña está enviando esta campaña".
5. **Envía uno por uno.**
   - Cada correo lleva `To` con una sola persona, su enlace de baja y estos encabezados:

     ```
     List-Unsubscribe: <https://…/api/boletin/baja?s=…&t=…>
     List-Unsubscribe-Post: List-Unsubscribe=One-Click
     ```
   - Si es un error de conexión o de autenticación (`ECONNECTION`, `ETIMEDOUT`, `EAUTH`, `ESOCKET` o respuesta 421), para la tanda, devuelve el cursor al último enviado con éxito, pasa la campaña a `paused` con `smtp` y el mensaje simple, y termina.
   - Si es un rechazo de un destinatario (5xx de ese correo), suma 1 a `failed`, lo agrega a `failures` (máximo 50) y sigue.
6. Suma los enviados a `sent` y a `config.smtpUsage`, y devuelve `{ status, total, sent, failed, pauseReason?, pauseMessage? }`.
   - Una tanda solo cambia el estado a `paused` (tope o SMTP) o a `sent`.
   - Si el usuario pausó mientras corría la tanda, el estado queda en `paused`.

- `total` se fija al empezar: el conteo de activos en ese momento. La barra no pasa del 100 % si entran suscriptores nuevos durante el envío.
- Los suscriptores nuevos con `_id` mayor que el cursor entran en la campaña; los que tienen un `_id` menor no.
- **Cierre a mitad de tanda:** si la página se cierra o la función se corta en medio de una tanda, los suscriptores ya reservados y no enviados se pierden. Son hasta 20, y no se repiten. Se acepta porque repetir correos daña la reputación del remitente.
- **El navegador repite tandas** mientras la respuesta sea `sending` y el usuario no haya pausado.
  - Pausar cambia el estado a `paused` con `user`; la tanda en curso termina y no se pide otra.
  - "Continuar" pone `sending` y sigue.

**El correo (`lib/campaignEmail.ts`, función pura)**

- Recibe la campaña, los productos (nombre, slug, precio, foto), la marca (nombre, logo, paleta, moneda, dirección) y la URL de baja.
- Devuelve `{ subject, html, text }`.
- **HTML:**
  - de una sola columna de 600 px, con tablas y estilos en línea, sin JavaScript ni CSS externo;
  - el preheader va oculto al inicio;
  - lleva logo o nombre, imagen, título, párrafos, botón con el color `button` de la paleta y una cuadrícula de productos (2 por fila: foto, nombre, precio con `formatPrice` y enlace a `/product/<slug>`);
  - los enlaces relativos se completan con `NEXT_PUBLIC_BASE_URL`, y las imágenes de Sanity llevan `?w=…&auto=format`.
- **Pie del correo:** "{tienda} · {dirección}", más "Recibes este correo porque te suscribiste en {tienda}. Darte de baja".
- Todo texto escrito por el dueño se escapa: `&`, `<`, `>`, `"` y `'`.
- La versión de texto plano lleva las mismas partes y las URLs completas.

## Errores

- **SMTP mal configurado:** la prueba de Ajustes dice qué revisar. Una campaña en curso queda en pausa con `smtp` y "Continuar" vuelve a intentar.
- **Falta `EMAIL_ENCRYPTION_KEY`:** Ajustes avisa "Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY)" y no guarda la contraseña.
  - Los enlaces de baja no se pueden firmar, así que no se permite enviar campañas.
  - Los pedidos siguen funcionando con las variables `SMTP_*`.
- **Producto borrado o archivado en una campaña:** no aparece en el correo ni en la vista previa. El editor lo muestra como "Ya no existe" para quitarlo.
- **Sanity caído durante una tanda:** la acción devuelve error y el navegador deja de pedir tandas. Muestra "No se pudo continuar el envío. Pulsa Continuar para reintentar".
  - La campaña queda en `sending` en Sanity.
  - Al volver a abrirla se ve como en pausa (ver §2).
- **Dos pestañas:** ver el paso 4 de la tanda.
- **CSV enorme o mal formado:** más de 5000 filas da "Divide el archivo en partes de 5000". Si no se encuentra la columna del correo: "No encontramos una columna de correos".

## Pruebas

**Puras, en `npm run -s check:permissions`:**
- cifrado: ida y vuelta, IV distinto en cada cifrado, y error si se altera el texto cifrado o el tag, o si se usa otra clave;
- firma de baja: válida, inválida, de otro id y de otra clave;
- CSV:
  - comas y punto y coma, comillas con comas dentro, BOM;
  - encabezados `email`/`correo`/`e-mail`, sin encabezado;
  - repetidos, mayúsculas, espacios, inválidos y el límite de 5000;
- resumen de importación contra los existentes: nuevos, ya estaban, dados de baja omitidos;
- validación de la configuración del SMTP y de la campaña, para guardar y para enviar;
- HTML de la campaña:
  - escapa `<script>` y comillas;
  - siempre trae el enlace de baja y la dirección;
  - omite el botón incompleto y los productos que faltan;
  - completa las URLs relativas;
- cálculo del restante diario, con cambio de fecha;
- selección de la tanda: `min(20, restante)`, cursor, fin de lista;
- clasificación de errores de SMTP: conexión o autenticación (pausa) contra rechazo del destinatario (fallido).

**En el navegador**, con un buzón falso de prueba (Ethereal: recibe sin entregar a nadie):
- la prueba de Ajustes, bien y con contraseña mala;
- agregar, importar (con un CSV que trae de todo), exportar y borrar;
- campaña con productos: vista previa, prueba a mí mismo, envío completo, Pausar y Continuar;
- tope diario bajo (por ejemplo 3) para ver la pausa por límite;
- dos pestañas;
- baja desde el enlace del correo y por POST de un clic.

Los datos de prueba llevan "ZZ" y se borran al final, dejando la configuración del SMTP como estaba antes de la prueba.
