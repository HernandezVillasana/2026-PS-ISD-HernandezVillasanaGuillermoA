
 // La página solo hace fetch a la API. El navegador manda la cookie solo (misma página, mismo servidor).
const $ = (id) => document.getElementById(id);

// Función para hacer peticiones al servidor y recibir respuestas.
async function llamar(metodo, url, cuerpo) {
    const opciones = {
        method: metodo
    };

    if (cuerpo !== undefined) {
        opciones.headers = {
            'Content-Type': 'application/json'
        };

        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(url, opciones);
    const texto = await respuesta.text();
    let datos = null;

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = { mensaje: texto };
        }
    }

    return {
        status: respuesta.status,
        datos: datos
    };
}
// Guardamos las respuestas visibles para comprobar
// qué ocurrió en cada petición.
function agregarBitacora(metodo, url, status, datos) {
    const li = document.createElement('li');
    const codigo = document.createElement('span');
    const contenido = document.createElement('pre');

    codigo.className = 'codigo';

    if (status >= 200 && status < 300) {
        codigo.classList.add('ok');
    } else if (status === 401) {
        codigo.classList.add('e401');
    } else if (status === 403) {
        codigo.classList.add('e403');
    } else {
        codigo.classList.add('error');
    }

    codigo.textContent = String(status);
    contenido.textContent = JSON.stringify(datos, null, 2);

    li.append(codigo);
    li.append(document.createTextNode(` ${metodo} ${url}`));
    li.append(contenido);

    $('bitacora').prepend(li);
}

// Consultamos al servidor porque la sesión no debe
// determinarse únicamente desde el navegador.
async function refrescarEstado() {
    const estado = $('estado');

    try {
        const resultado = await llamar('GET', '/api/sesion');

        if (resultado.status === 200 && resultado.datos) {
            const datos = resultado.datos;
            const usuario = datos.usuario || {};
            const nombre = usuario.nombre || usuario.usuario || 'Usuario';
            const rol = usuario.rol ? ` (${usuario.rol})` : '';

            estado.className = 'estado con-sesion';
            estado.textContent =
                `${nombre}${rol} · Sesión: ${datos.sesion || '(sin id)'} · ` +
                `Vence en ${datos.expiraEnSegundos ?? '—'} s`;
        } else {
            estado.className = 'estado sin-sesion';
            estado.textContent =
                `Sin sesión (el servidor responde ${resultado.status})`;
        }

        $('cookie-js').textContent = document.cookie || '(vacío)';
    } catch (error) {
        estado.className = 'estado sin-sesion';
        estado.textContent = 'No se pudo consultar la sesión';
        $('cookie-js').textContent = document.cookie || '(vacío)';
        agregarBitacora('GET', '/api/sesion', 0, { error: error.message });
        console.error('Error al consultar la sesión:', error);
    }
}

// Reconstruimos la tabla para evitar que se acumulen
// filas duplicadas al actualizarla.
async function refrescarSesiones() {
    const tabla = $('tabla-sesiones');
    tabla.replaceChildren();

    try {
        const resultado = await llamar(
            'GET',
            '/api/diagnostico/sesiones'
        );

        if (resultado.status !== 200 || !resultado.datos) {
            $('donde').textContent =
                `No se pudo consultar el servidor (${resultado.status})`;
            return;
        }

        const datos = resultado.datos;

        $('donde').textContent =
            datos.almacen === 'mysql'
                ? 'En MySQL, tabla sessions'
                : 'En la memoria del servidor';

        const sesiones = Array.isArray(datos.sesiones) ? datos.sesiones : [];

        if (sesiones.length === 0) {
            const fila = document.createElement('tr');
            const celda = document.createElement('td');

            celda.colSpan = 4;
            celda.textContent = '(sin sesiones)';

            fila.append(celda);
            tabla.append(fila);
            return;
        }

        sesiones.forEach((sesion) => {
            const fila = document.createElement('tr');
            const esLaTuya = sesion.esLaTuya ?? sesion.esLaTuta;

            if (esLaTuya) {
                fila.classList.add('tuya');
            }

            const valores = [
                `${sesion.sesion || '(sin id)'}${esLaTuya ? ' (la tuya)' : ''}`,
                sesion.usuario ?? '(sin usuario)',
                sesion.visitas ?? 0,
                sesion.expira
                    ? new Date(sesion.expira).toLocaleString()
                    : '(sin fecha)'
            ];

            valores.forEach((valor) => {
                const celda = document.createElement('td');
                celda.textContent = String(valor);
                fila.append(celda);
            });

            tabla.append(fila);
        });
    } catch (error) {
        $('donde').textContent = 'No se pudo consultar el servidor';
        agregarBitacora(
            'GET',
            '/api/diagnostico/sesiones',
            0,
            { error: error.message }
        );
        console.error('Error al consultar las sesiones:', error);
    }
}

// Actualizamos ambas tarjetas después de cada acción
// para que reflejen los datos actuales del servidor.
async function refrescarTodo() {
    await refrescarEstado();
    await refrescarSesiones();
}

// Evitamos recargar la página al iniciar sesión.
$('form-login').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const cuerpo = {
        usuario: $('usuario').value,
        contrasena: $('contrasena').value
    };

    try {
        const resultado = await llamar('POST', '/api/login', cuerpo);

        agregarBitacora(
            'POST',
            '/api/login',
            resultado.status,
            resultado.datos
        );

        await refrescarTodo();
    } catch (error) {
        agregarBitacora('POST', '/api/login', 0, { error: error.message });
        console.error('Error al iniciar sesión:', error);
    }
});

// Usamos los atributos del HTML para manejar todos
// los botones de la API con un solo procedimiento.
document.querySelectorAll('[data-url]').forEach((boton) => {
    boton.addEventListener('click', async () => {
        const metodo = boton.dataset.metodo;
        const url = boton.dataset.url;

        try {
            const resultado = await llamar(metodo, url);

            agregarBitacora(
                metodo,
                url,
                resultado.status,
                resultado.datos
            );

            await refrescarTodo();
        } catch (error) {
            agregarBitacora(metodo, url, 0, { error: error.message });
            console.error('Error en la petición:', error);
        }
    });
});

// Facilitamos el uso de las cuentas de ejemplo.
$('usuario').addEventListener('change', () => {
    $('contrasena').value = $('usuario').value + '12345';
});

// Permitimos actualizar la información sin recargar.
$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', refrescarSesiones);

// Cargamos la configuración y el estado inicial.
// El script está al final del body, así que el HTML ya existe.
async function iniciar() {
    try {
        const resultado = await llamar('GET', '/api/config');

        $('config').textContent =
            JSON.stringify(resultado.datos, null, 2);

        await refrescarTodo();
    } catch (error) {
        agregarBitacora('GET', '/api/config', 0, { error: error.message });
        console.error('No se pudo cargar la página:', error);
    }
}

iniciar();

