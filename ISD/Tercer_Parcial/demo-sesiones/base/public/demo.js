
 // La página solo hace fethc a la api. El navegador manda la cookie solo (misma página, mismo servidor).
// usamos este atajo para encontrar los elementos de la página de la misma forma en todo el archivo.
// asi, las funciones se enfocan en actualizar la pantalla sin para no repetir búsquedas largas.
const $ = (id) => document.getElementById(id);

// Reunimos aquí las peticiones para que todas las acciones se comuniquen con el servidor de forma parecida.
// También sirve mostrar respuestas aunque el servidor no devuelva datos en el formato esperado.
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
// la bitacora deja a la vista lo que respondio el servidor después de cada acción.
// esto facilita seguir la demostración y distinguir, por ejemplo, entre una sesion valida y un acceso rechazado.
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

// preguntamos al servidor quién inició sesion porque el navegador por sí solo no puede confirmar esa informacion.
// asi, el mensaje de la pagina refleja el estado real y también permite observar qué cookie puede leer JavaScript.
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

// Esta tabla permite observar las sesiones que conserva el servidor y dónde las está guardando.
// Es útil para comparar la sesión actual con otras y entender qué pasa al iniciar o cerrar sesión.
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

        // mostrar cada sesión ayuda a comparar la propia con las de otros navegadores.
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

            // Mantener una celda por valor conserva el orden de las columnas de la tabla.
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

// Después de una acción pueden cambiar tanto el estado del usuario como la lista de sesiones.
// Actualizar ambas partes juntas evita que la página muestre información desactualizada.
async function refrescarTodo() {
    await refrescarEstado();
    await refrescarSesiones();
}

// Procesamos el inicio de sesión aquí para no recargar la página ni perder la bitácora de la demostración.
// Después mostramos la respuesta del servidor y el estado actualizado de la sesión.
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

// Los botones de la página realizan distintas acciones, pero todas necesitan mostrar su resultado y actualizar el estado.
// Compartir este manejo evita que cada botón se comporte de manera diferente.
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

// Las cuentas de esta actividad usan una contraseña fácil de recordar que depende del nombre elegido.
// Completarla automáticamente ayuda a probar cada cuenta sin confundir sus datos.
$('usuario').addEventListener('change', () => {
    $('contrasena').value = $('usuario').value + '12345';
});

// Estos botones sirven para volver a consultar el estado o las sesiones cuando se quiera.
// No recargan la página, así que la bitácora y el resto de la demostración permanecen visibles.
$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', refrescarSesiones);

// Al abrir la página, consultamos la configuración y el estado actual para que no dependa de una recarga manual.
// De esta manera, la demostración comienza mostrando información real desde el primer momento.
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
