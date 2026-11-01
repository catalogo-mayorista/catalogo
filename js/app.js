
//Configuración

const CONFIG = {
    productosPorPagina: 30,
};

// Estado

let productos = [];
let cantidadVisible = CONFIG.productosPorPagina;

//Elementos HTML
const listaProductos = document.getElementById("lista-productos")
const contador = document.getElementById("contador-resultados")
const botonVerMas = document.getElementById("boton-ver-mas");

//Recibe precio en centavos y devuelve texto

function formatearPrecio(centavos){
    return new Intl.NumberFormat("es-AR", {

        style: "currency",
        currency:"ARS",
        }).format(centavos/100)
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
    <li><span> 50 a 99 u.</span> <strong>${formatearPrecio(producto.precios.p50)}</strong></li>
        <li><span> 100 a 149 u.</span> <strong>${formatearPrecio(producto.precios.p100)}</strong></li>
            <li><span> 150 u. o más </span> <strong>${formatearPrecio(producto.precios.p150)}</strong></li>
            </ul>

        <div class="selector-cantidad">
        <button typer="button" class= "boton-restar" aria-label="Restar 10">-</button>
        <input type= "number" class = "campo-cantidad" value="50" min ="50" step="1"
        inputmode="numeric" aria-label="Cantidad">
        <button type ="button" class= "boton-sumar" aria-label="sumar 10">+</button>
        </div>

        <button type="button" class="boton-agregar"> Agregar al pedido </button>

        </article>
        `;
        
}

//Dibuja en pantalla los productos que corresponden segun el estado

function mostrarProductos(){
    const visibles =productos.slice(0, cantidadVisible);
    listaProductos.innerHTML = visibles.map(crearTarjeta).join("");

    contador.textContent =`Mostrando ${visibles.length} de ${productos.length} productos`;

    botonVerMas.hidden = visibles.length >=productos.length;
}

// Cargar los datos

async function cargarProductos() {
    try{
        const respuesta = await fetch ("data/productos.json");
        
        if(!respuesta.ok){
            throw new Error (`No se pudo leer el archivo (error ${respuesta.status})`);

        }
        productos = await respuesta.json();
        mostrarProductos
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

//Inicio
cargarProductos();