// =====================================================
//  CATÁLOGO MAYORISTA — app.js
// =====================================================

// ---------- 1. CONFIGURACIÓN ----------
const CONFIG = {
  productosPorPagina: 30,
  cantidadMinima: 50,
  pasoCantidad: 10,

  // WhatsApp de la proveedora: código de país (54) + 9 + código de área sin 0 + número sin 15.
  // Ejemplo para Rosario (341) 155-123456 → "5493415123456"
  whatsapp: "5493541657745",
};

// ---------- 2. ESTADO ----------
// "Estado" = los datos que la página necesita recordar mientras se usa.
let productos = [];                                // todos los productos del JSON
let cantidadVisible = CONFIG.productosPorPagina;   // cuántos se muestran ahora
let textoBusqueda = "";                            // lo que escribió la clienta
let pedido = [];                                   // renglones del pedido: { id, cantidad }

// ---------- 3. ELEMENTOS DEL HTML ----------
const listaProductos = document.getElementById("lista-productos");
const contador = document.getElementById("contador-resultados");
const botonVerMas = document.getElementById("boton-ver-mas");
const campoBusqueda = document.getElementById("campo-busqueda");

const panelPedido = document.getElementById("panel-pedido");
const listaPedido = document.getElementById("lista-pedido");
const pedidoVacio = document.getElementById("pedido-vacio");
const totalUnidades = document.getElementById("total-unidades");
const totalPesos = document.getElementById("total-pesos");
const botonEnviar = document.getElementById("boton-enviar");
const barraPedido = document.getElementById("barra-pedido");
const barraResumen = document.getElementById("barra-resumen");
const botonCerrarPedido = document.getElementById("boton-cerrar-pedido");

// ---------- 4. UTILIDADES ----------

// Recibe un precio en centavos (13528210) y devuelve texto ("$ 135.282,10")
function formatearPrecio(centavos) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

// Pasa un texto a minúsculas y le saca los acentos: "Lancôme" → "lancome"
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Devuelve qué escala de precio corresponde a una cantidad (regla R4)
function escalaSegunCantidad(cantidad) {
  if (cantidad >= 150) {
    return "p150";
  }
  if (cantidad >= 100) {
    return "p100";
  }
  return "p50";
}

// Corrige cualquier valor para que sea un número entero de 50 o más (regla R3)
function validarCantidad(valor) {
  const numero = Math.round(Number(valor));

  if (Number.isNaN(numero) || numero < CONFIG.cantidadMinima) {
    return CONFIG.cantidadMinima;
  }
  return numero;
}

// ---------- 5. FILTRAR ----------

// Devuelve los productos que coinciden con la búsqueda actual
function obtenerProductosFiltrados() {
  const palabras = normalizar(textoBusqueda).split(" ").filter(palabra => palabra !== "");

  if (palabras.length === 0) {
    return productos;
  }

  return productos.filter(producto => {
    const textoProducto = normalizar(producto.descripcion + " " + producto.id + " " + producto.categoria);
    return palabras.every(palabra => textoProducto.includes(palabra));
  });
}

// ---------- 6. DIBUJAR ----------

// Recibe UN producto y devuelve el HTML de SU tarjeta (como texto)
function crearTarjeta(producto) {
  const etiqueta = producto.categoria === "Árabe"
    ? `<p class="tarjeta-categoria">Árabe</p>`
    : "";

  return `
    <article class="tarjeta" data-id="${producto.id}">
      ${etiqueta}
      <h3 class="tarjeta-nombre">${producto.descripcion}</h3>
      <p class="tarjeta-codigo">Cód. ${producto.id}</p>

      <ul class="escalas">
        <li class="activa" data-escala="p50"><span>50 a 99 u.</span> <strong>${formatearPrecio(producto.precios.p50)}</strong></li>
        <li data-escala="p100"><span>100 a 149 u.</span> <strong>${formatearPrecio(producto.precios.p100)}</strong></li>
        <li data-escala="p150"><span>150 u. o más</span> <strong>${formatearPrecio(producto.precios.p150)}</strong></li>
      </ul>

      <div class="selector-cantidad">
        <button type="button" class="boton-restar" aria-label="Restar 10">−</button>
        <input type="number" class="campo-cantidad" value="${CONFIG.cantidadMinima}" min="${CONFIG.cantidadMinima}" step="1"
               inputmode="numeric" aria-label="Cantidad">
        <button type="button" class="boton-sumar" aria-label="Sumar 10">+</button>
      </div>

      <button type="button" class="boton-agregar">Agregar al pedido</button>
    </article>
  `;
}

// Dibuja en pantalla los productos que corresponden según el estado
function mostrarProductos() {
  const filtrados = obtenerProductosFiltrados();
  const visibles = filtrados.slice(0, cantidadVisible);
  const palabra = filtrados.length === 1 ? "producto" : "productos";

  listaProductos.innerHTML = visibles.map(crearTarjeta).join("");

  if (filtrados.length === 0) {
    contador.textContent = `No encontramos productos para "${textoBusqueda}"`;
  } else {
    contador.textContent = `Mostrando ${visibles.length} de ${filtrados.length} ${palabra}`;
  }

  // Si ya se ven todos, el botón "Ver más" no hace falta
  botonVerMas.hidden = visibles.length >= filtrados.length;
}

// Cambia la cantidad de UNA tarjeta y resalta la escala de precio que corresponde
function cambiarCantidad(tarjeta, nuevaCantidad) {
  const campo = tarjeta.querySelector(".campo-cantidad");
  const cantidad = validarCantidad(nuevaCantidad);
  const escala = escalaSegunCantidad(cantidad);

  campo.value = cantidad;

  tarjeta.querySelectorAll(".escalas li").forEach(li => {
    li.classList.toggle("activa", li.dataset.escala === escala);
  });
}

// ---------- 7. PEDIDO: DATOS ----------

// Busca un producto del catálogo por su código
function buscarProducto(id) {
  return productos.find(producto => producto.id === id);
}

// Agrega un producto al pedido. Si ya estaba, suma las cantidades.
function agregarAlPedido(id, cantidad) {
  const renglonExistente = pedido.find(renglon => renglon.id === id);

  if (renglonExistente) {
    renglonExistente.cantidad = renglonExistente.cantidad + cantidad;
  } else {
    pedido.push({ id: id, cantidad: cantidad });
  }

  mostrarPedido();
}

// Cambia la cantidad de un producto que ya está en el pedido
function actualizarCantidadEnPedido(id, nuevaCantidad) {
  const renglon = pedido.find(renglon => renglon.id === id);
  renglon.cantidad = validarCantidad(nuevaCantidad);
  mostrarPedido();
}

// Saca un producto del pedido
function quitarDelPedido(id) {
  pedido = pedido.filter(renglon => renglon.id !== id);
  mostrarPedido();
}

// Calcula todo lo que hace falta para mostrar UN renglón
function calcularRenglon(renglon) {
  const producto = buscarProducto(renglon.id);
  const escala = escalaSegunCantidad(renglon.cantidad);
  const precioUnitario = producto.precios[escala];

  return {
    producto: producto,
    cantidad: renglon.cantidad,
    precioUnitario: precioUnitario,
    subtotal: precioUnitario * renglon.cantidad,
  };
}

// Suma las unidades y los pesos de todo el pedido
function calcularTotales() {
  return pedido.reduce((totales, renglon) => {
    const calculo = calcularRenglon(renglon);
    return {
      unidades: totales.unidades + calculo.cantidad,
      pesos: totales.pesos + calculo.subtotal,
    };
  }, { unidades: 0, pesos: 0 });
}

// ---------- 8. PEDIDO: DIBUJAR ----------

// Devuelve el HTML de UN renglón del pedido
function crearRenglon(renglon) {
  const calculo = calcularRenglon(renglon);

  return `
    <li class="renglon" data-id="${renglon.id}">
      <p class="renglon-nombre">${calculo.producto.descripcion}</p>
      <p class="renglon-detalle">
        ${calculo.cantidad} u. x ${formatearPrecio(calculo.precioUnitario)} =
        <strong>${formatearPrecio(calculo.subtotal)}</strong>
      </p>
      <div class="selector-cantidad">
        <button type="button" class="boton-restar" aria-label="Restar 10">−</button>
        <input type="number" class="campo-cantidad" value="${calculo.cantidad}" min="${CONFIG.cantidadMinima}" step="1"
               inputmode="numeric" aria-label="Cantidad">
        <button type="button" class="boton-sumar" aria-label="Sumar 10">+</button>
      </div>
      <button type="button" class="boton-eliminar">Quitar</button>
    </li>
  `;
}

// Dibuja el pedido completo según el estado
function mostrarPedido() {
  const totales = calcularTotales();
  const estaVacio = pedido.length === 0;

  listaPedido.innerHTML = pedido.map(crearRenglon).join("");
  pedidoVacio.hidden = !estaVacio;

  totalUnidades.textContent = totales.unidades;
  totalPesos.textContent = formatearPrecio(totales.pesos);

  botonEnviar.disabled = estaVacio;

  if (estaVacio) {
    barraResumen.textContent = "Tu pedido está vacío";
  } else {
    const palabra = pedido.length === 1 ? "producto" : "productos";
    barraResumen.textContent = `Pedido: ${pedido.length} ${palabra} · ${totales.unidades} u. · ${formatearPrecio(totales.pesos)}`;
  }
}

// ---------- 9. WHATSAPP ----------

// Arma el texto del pedido para mandar por WhatsApp
function armarMensaje() {
  const lineas = pedido.map(renglon => {
    const calculo = calcularRenglon(renglon);
    return `- [${calculo.producto.id}] ${calculo.producto.descripcion}\n` +
           `   ${calculo.cantidad} u. x ${formatearPrecio(calculo.precioUnitario)} = ${formatearPrecio(calculo.subtotal)}`;
  });

  const totales = calcularTotales();

  return [
    "Hola, quiero realizar el siguiente pedido:",
    "",
    ...lineas,
    "",
    `Total de unidades: ${totales.unidades}`,
    `*Total: ${formatearPrecio(totales.pesos)}*`,
  ].join("\n");
}

// Abre WhatsApp con el mensaje ya escrito
function enviarPorWhatsApp() {
  if (pedido.length === 0) {
    return;
  }

  const mensaje = armarMensaje();
  const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
}

function abrirPedido() {
  panelPedido.classList.add("abierto");
}

function cerrarPedido() {
  panelPedido.classList.remove("abierto");
}

// ---------- 10. CARGAR LOS DATOS ----------
async function cargarProductos() {
  try {
    const respuesta = await fetch("data/productos.json");

    if (!respuesta.ok) {
      throw new Error(`No se pudo leer el archivo (error ${respuesta.status})`);
    }

    productos = await respuesta.json();
    mostrarProductos();
    mostrarPedido();
  } catch (error) {
    console.error(error);
    contador.textContent = "No pudimos cargar los productos. Probá recargar la página.";
  }
}

// ---------- 11. EVENTOS ----------
botonVerMas.addEventListener("click", () => {
  cantidadVisible = cantidadVisible + CONFIG.productosPorPagina;
  mostrarProductos();
});

campoBusqueda.addEventListener("input", () => {
  textoBusqueda = campoBusqueda.value;
  cantidadVisible = CONFIG.productosPorPagina;   // cada búsqueda nueva arranca de 30
  mostrarProductos();
});

// Botones − y + de TODAS las tarjetas (delegación de eventos)
listaProductos.addEventListener("click", evento => {
  const tarjeta = evento.target.closest(".tarjeta");
  if (!tarjeta) {
    return;
  }

  const campo = tarjeta.querySelector(".campo-cantidad");
  const cantidadActual = Number(campo.value);

  if (evento.target.closest(".boton-sumar")) {
    cambiarCantidad(tarjeta, cantidadActual + CONFIG.pasoCantidad);
  }

  if (evento.target.closest(".boton-restar")) {
    cambiarCantidad(tarjeta, cantidadActual - CONFIG.pasoCantidad);
  }

  if (evento.target.closest(".boton-agregar")) {
    const boton = evento.target.closest(".boton-agregar");
    agregarAlPedido(tarjeta.dataset.id, validarCantidad(campo.value));

    // Aviso visual de que se agregó
    boton.textContent = "Agregado ✓";
    setTimeout(() => {
      boton.textContent = "Agregar al pedido";
    }, 1200);
  }
});

// Cantidad escrita a mano: se valida cuando la clienta termina de escribir
listaProductos.addEventListener("change", evento => {
  if (!evento.target.matches(".campo-cantidad")) {
    return;
  }

  const tarjeta = evento.target.closest(".tarjeta");
  cambiarCantidad(tarjeta, evento.target.value);
});

// Botones de los renglones del pedido (delegación de eventos)
listaPedido.addEventListener("click", evento => {
  const renglon = evento.target.closest(".renglon");
  if (!renglon) {
    return;
  }

  const id = renglon.dataset.id;
  const campo = renglon.querySelector(".campo-cantidad");
  const cantidadActual = Number(campo.value);

  if (evento.target.closest(".boton-sumar")) {
    actualizarCantidadEnPedido(id, cantidadActual + CONFIG.pasoCantidad);
  }

  if (evento.target.closest(".boton-restar")) {
    actualizarCantidadEnPedido(id, cantidadActual - CONFIG.pasoCantidad);
  }

  if (evento.target.closest(".boton-eliminar")) {
    quitarDelPedido(id);
  }
});

// Cantidad escrita a mano en el pedido
listaPedido.addEventListener("change", evento => {
  if (!evento.target.matches(".campo-cantidad")) {
    return;
  }

  const id = evento.target.closest(".renglon").dataset.id;
  actualizarCantidadEnPedido(id, evento.target.value);
});

// Abrir y cerrar el panel (celular)
barraPedido.addEventListener("click", abrirPedido);
botonCerrarPedido.addEventListener("click", cerrarPedido);

// Enviar el pedido
botonEnviar.addEventListener("click", enviarPorWhatsApp);

// ---------- 12. INICIO ----------
cargarProductos();
