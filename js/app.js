
//Configuración

const CONFIG = {
    productosPorPagina: 30,
    cantidadMinima: 50,
    pasoCantidad: 10,
};

// Estado

let productos = [];
let cantidadVisible = CONFIG.productosPorPagina;
let textoBusqueda ="";

//Elementos HTML
const listaProductos = document.getElementById("lista-productos")
const contador = document.getElementById("contador-resultados")
const botonVerMas = document.getElementById("boton-ver-mas");
const campoBusqueda = document.getElementById("campo-busqueda");

//Recibe precio en centavos y devuelve texto

function formatearPrecio(centavos){
    return new Intl.NumberFormat("es-AR", {

        style: "currency",
        currency:"ARS",
        }).format(centavos/100)
}

//pasa el texto a minuscula y saca acentos
function normalizar(texto){
    return texto
    .toLowerCase()
    .normalize ("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}
 
//Devuelve que escala de precio corresponde a una cantidad

function escalaSegunCantidad (cantidad){
    if (cantidad >= 150){
        return "p150";
    }
    if (cantidad >=100) {
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

//Filtrar

//devuelve productos que coinciden con la busqueda

function obtenerProductosFiltrados(){
    const palabras = normalizar(textoBusqueda).split(" ").filter(palabra => palabra !== "");

    if (palabras.length ===0) {
        return productos;
    }
    return productos.filter(producto => {
        const textoProducto = normalizar (producto.descripcion +" "+producto.id + "" + producto.categoria);
        return palabras.every(palabra => textoProducto.includes(palabra));
    });
}

//Dibujar

function crearTarjeta(producto) {
    const etiqueta =producto.categoria === " Árabe" ? `<p class="tarjeta-categoria"> Árabe </p>` : "";
     
    return`
    <article class ="tarjeta" data-id= "${producto.id}>
    ${etiqueta}
    <h3 class="tarjeta-nombre">${producto.descripcion}>
    <p class="tarjeta-codigo"> Cód. ${producto.id}</p>

   <ul class="escalas">
        <li class="activa" data-escala="p50"><span>50 a 99 u.</span> <strong>${formatearPrecio(producto.precios.p50)}</strong></li>
        <li data-escala="p100"><span>100 a 149 u.</span> <strong>${formatearPrecio(producto.precios.p100)}</strong></li>
        <li data-escala="p150"><span>150 u. o más</span> <strong>${formatearPrecio(producto.precios.p150)}</strong></li>
      </ul>

        <div class="selector-cantidad">
        <button typer="button" class= "boton-restar" aria-label="Restar 10">-</button>
                <input type="number" class="campo-cantidad" value="${CONFIG.cantidadMinima}" min="${CONFIG.cantidadMinima}" step="1"
               inputmode="numeric" aria-label="Cantidad">
        <button type ="button" class= "boton-sumar" aria-label="sumar 10">+</button>
        </div>

        <button type="button" class="boton-agregar"> Agregar al pedido </button>

        </article>
        `;
        
}

//Dibuja en pantalla los productos que corresponden segun el estado

function mostrarProductos(){
    const filtrados = obtenerProductosFiltrados();
    const visibles = filtrados.slice(0, cantidadVisible);
     const palabra = filtrados.length === 1 ? "producto" : "productos";

    listaProductos.innerHTML = visibles.map(crearTarjeta).join("");
    if (filtrados-length ===0){
        contador.textContent = `No encontramos productos para "${textoBusqueda}"`;
    } else {
        contador.textContent = `Mostrando ${visibles.length} de ${filtrados.length} ${palabra} `;
    }

   

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

// Cargar los datos

async function cargarProductos() {
    try{
        const respuesta = await fetch ("data/productos.json");
        
        if(!respuesta.ok){
            throw new Error (`No se pudo leer el archivo (error ${respuesta.status})`);

        }
        productos = await respuesta.json();
        mostrarProductos();
    } catch (error) {
        console.error(error);
        contador.textContent = "No pudimos cargar los productos. Probá recargar la página"
    }
    
}

//Eventos

botonVerMas.addEventListener("click", () => {
    cantidadVisible = cantidadVisible + CONFIG.productosPorPagina;
    mostrarProductos();
});

campoBusqueda.addEventListener("input", () => {
    textoBusqueda = campoBusqueda.value;
    cantidadVisible = CONFIG.productosPorPagina;
    mostrarProductos();
})
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
});

// Cantidad escrita a mano: se valida cuando la clienta termina de escribir
listaProductos.addEventListener("change", evento => {
  if (!evento.target.matches(".campo-cantidad")) {
    return;
  }

  const tarjeta = evento.target.closest(".tarjeta");
  cambiarCantidad(tarjeta, evento.target.value);
});

//Inicio
cargarProductos();