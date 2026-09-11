/* 
Vamos a programat un cliente, mediante el cual vamos a probar la arquitectura  cliente-servidor por medio de una peticion mediante procolo Http utilizando el metodo Get, para ello vamos a utilizar la libreria de Node.js llamada Axios, la cual nos permite hacer peticiones Http de manera sencilla y rapida.
Que tenemos que conectarnos al servicio de la BD
el problema es como apuntar al backend
cngztufrstbrmlmtucdz.supabase.com
*/
const API_URL = "http://proyectobackcecyt9.onrender.com"; // URL del backend
async function main() {
    console.log("Cliente Peticion Get -> a ${API_URL}/api/talleres");
    const inicio = Date.now();
    const respuesta = await
    fetch(`${API_URL}/api/talleres`);
    //Nos da el tiempo de ida y vuelta por medio  de la peticion mediante RTT
    const duracionMs = Date.now() - inicio;
    // un estatus de error 500 seria una respuesta valida si el servicio de la BD no esta disponible
    const cuerpo = await respuesta.json();
    console.log("Ciclo de peticion - respuesta");
    console.log("Protocolo HTTPS sobre TCP : ${respuesta.url}");
    console.log("Tiempo de ida y vuelta (RTT) : ${duracionMs} ms");
    console.log(JSON.stringify(cuerpo, null, 2));

}
main();