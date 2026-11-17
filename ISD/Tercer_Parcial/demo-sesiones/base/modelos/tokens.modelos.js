//En este archivo vamos a tener la lista negra de la tabla de los tokens revocados.
function crearModeloTokens(almacen){
  const tokensRevocados = new Set();
  return {
    agregarToken: (token) => {
      tokensRevocados.add(token);
    },
    estaRevocado: (token) => {
      return tokensRevocados.has(token);
    }
  };
}