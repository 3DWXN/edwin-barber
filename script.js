// ===== IMPORTAR FIREBASE =====
import { guardarCita, obtenerHorasOcupadas, guardarResena, obtenerResenas } from './firebase.js'

// ===== TURNOS POR DÍA =====
const turnosSabado = [
  '2:00 PM', '2:40 PM', '3:20 PM', '4:00 PM', '4:40 PM',
  '5:20 PM', '6:00 PM', '6:40 PM', '7:20 PM', '8:00 PM'
]
const turnosDomingo = [
  '9:00 AM', '9:40 AM', '10:20 AM', '11:00 AM', '11:40 AM',
  '12:20 PM', '1:00 PM', '1:40 PM', '2:20 PM'
]

// ===== PRECIOS =====
const preciosServicios = {
  'Corte Básico': 20000,
  'Corte + Cejas': 24000,
  'Corte + Barba': 27000,
  'Corte + Masaje': 28000,
  'Experiencia Gold': 45000
}

// ===== ESTADO =====
let fechaSeleccionada = null
let horaSeleccionada = null
let estrellaSeleccionada = 0

// ===== DATOS SERVICIOS =====
const servicios = {
  'corte-clasico': {
    icono: '💇‍♂️', titulo: 'Corte Básico', precio: '$20.000',
    descripcion: 'El corte profesional de siempre, con asesoría personalizada según tu tipo de rostro y cabello.',
    lista: ['Asesoría personalizada de estilo', 'Corte con máquina y tijera', 'Definición de líneas', 'Acabado con productos profesionales']
  },
  'corte-cejas': {
    icono: '✂️', titulo: 'Corte + Cejas', precio: '$24.000',
    descripcion: 'El combo más solicitado. Corte completo más perfilado preciso de cejas.',
    lista: ['Corte de cabello profesional', 'Perfilado y definición de cejas', 'Eliminación de pelos sueltos', 'Asesoría de forma según tu rostro']
  },
  'corte-barba': {
    icono: '🪒', titulo: 'Corte + Barba', precio: '$27.000',
    descripcion: 'La combinación perfecta para el hombre que cuida cada detalle.',
    lista: ['Corte de cabello completo', 'Perfilado de barba con navaja', 'Diseño personalizado de barba', 'Definición de líneas y degradado']
  },
  'corte-masaje': {
    icono: '💆', titulo: 'Corte + Masaje', precio: '$28.000',
    descripcion: 'Más que un corte — una experiencia completa de relajación.',
    lista: ['Corte de cabello profesional', 'Masaje ocular', 'Reduce tensión y estrés']
  },
  'black-mask': {
    icono: '🖤', titulo: 'Black Mask Nasal', precio: '$5.000',
    descripcion: 'Tratamiento facial express con mascarilla peel-off negra.',
    lista: ['Preparación con toalla caliente', 'Apertura de poros', 'Aplicación de mascarilla peel-off', 'Cierre de poros con toalla fría']
  },
  'masaje-ocular': {
    icono: '👁️', titulo: 'Masaje Ocular', precio: '$10.000',
    descripcion: '¿Pasas horas frente al celular? Este masajeador profesional desinfla y relaja los ojos en minutos.',
    lista: ['Masajeador ocular eléctrico profesional', 'Reduce ojeras y tensión ocular', 'Estimula la circulación', 'Sensación de relajación inmediata']
  },
  'experiencia-gold': {
    icono: '✦', titulo: 'Experiencia Gold', precio: '$45.000',
    descripcion: 'El servicio premium de Edwin Barber. Todo en una sola visita.',
    lista: ['Corte de cabello profesional', 'Perfilado y diseño de cejas', 'Perfilado completo de barba', 'Black mask nasal peel-off', 'Masaje ocular con dispositivo profesional']
  },
  'domicilio': {
    icono: '🏠', titulo: 'Servicio a Domicilio', precio: '+$8.000',
    descripcion: 'Todos los servicios disponibles en la comodidad de tu hogar.',
    lista: ['Disponible en Jamundí y zonas cercanas', 'Todos los servicios disponibles', 'Herramientas profesionales a domicilio', 'Consultar disponibilidad por WhatsApp']
  },
  'barba': {
    icono: '🧔‍♂️', titulo: 'Barba', precio: '$10.000',
    descripcion: 'Perfilado y definición de barba profesional.',
    lista: ['Perfilado con navaja', 'Definición de líneas', 'Diseño personalizado']
  },
  'cejas': {
    icono: '🤨', titulo: 'Cejas', precio: '$5.000',
    descripcion: 'Perfilado y definición de cejas.',
    lista: ['Perfilado preciso', 'Eliminación de pelos sueltos', 'Forma según tu rostro']
  }
}

// ===== MODALES =====
window.abrirServicio = function(id) {
  const s = servicios[id]
  if (!s) return
  document.getElementById('modal-icono').textContent = s.icono
  document.getElementById('modal-titulo').textContent = s.titulo
  document.getElementById('modal-precio').textContent = s.precio
  document.getElementById('modal-descripcion').textContent = s.descripcion
  const lista = document.getElementById('modal-lista')
  lista.innerHTML = ''
  s.lista.forEach(item => {
    const li = document.createElement('li')
    li.textContent = item
    lista.appendChild(li)
  })
  document.getElementById('modal-servicio').classList.add('abierto')
  document.body.style.overflow = 'hidden'
}

window.cerrarModal = function() {
  document.getElementById('modal-servicio').classList.remove('abierto')
  document.body.style.overflow = ''
}

window.abrirCitas = function() {
  fechaSeleccionada = null
  horaSeleccionada = null
  document.getElementById('modal-citas').classList.add('abierto')
  document.body.style.overflow = 'hidden'
  document.getElementById('seccion-calendario').style.display = 'none'
  document.getElementById('seccion-horas').style.display = 'none'
  document.getElementById('boton-agendar').style.display = 'none'
}

window.cerrarCitas = function() {
  document.getElementById('modal-citas').classList.remove('abierto')
  document.body.style.overflow = ''
}

window.abrirResena = function() {
  estrellaSeleccionada = 0
  document.querySelectorAll('.estrella-btn').forEach(e => e.classList.remove('activa'))
  document.getElementById('modal-resena').classList.add('abierto')
  document.body.style.overflow = 'hidden'
}

window.cerrarResena = function() {
  document.getElementById('modal-resena').classList.remove('abierto')
  document.body.style.overflow = ''
}

// ===== TOTAL =====
function calcularTotal() {
  const servicioSeleccionado = document.getElementById('cita-servicio').value
  const precioBase = preciosServicios[servicioSeleccionado] || 0
  let totalAdiciones = 0
  const adicionesSeleccionadas = []
  document.querySelectorAll('.adicion-checkbox:checked').forEach(cb => {
    const nombre = cb.dataset.nombre
    const precio = parseInt(cb.dataset.precio)
    totalAdiciones += precio
    adicionesSeleccionadas.push(`${nombre} ($${precio.toLocaleString()})`)
  })
  return { total: precioBase + totalAdiciones, adicionesSeleccionadas }
}

function actualizarTotal() {
  const { total } = calcularTotal()
  const boton = document.getElementById('boton-agendar')
  if (boton.style.display !== 'none') {
    boton.textContent = total > 0
      ? `Confirmar cita — $${total.toLocaleString()}`
      : 'Confirmar cita'
  }
}

// ===== CALENDARIO =====
function renderCalendario() {
  const contenedor = document.getElementById('calendario')
  contenedor.innerHTML = ''
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  for (let i = 0; i < 30; i++) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + i)
    const diaSemana = fecha.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) continue
    const dia = document.createElement('div')
    dia.className = 'cal-dia'
    const nombreDia = diaSemana === 6 ? 'Sáb' : 'Dom'
    const fechaStr = fecha.toISOString().split('T')[0]
    dia.innerHTML = `
      <span class="cal-nombre">${nombreDia}</span>
      <span class="cal-numero">${fecha.getDate()}</span>
      <span class="cal-mes">${fecha.toLocaleString('es', { month: 'short' })}</span>
    `
    dia.addEventListener('click', () => seleccionarFecha(fechaStr, diaSemana, dia))
    contenedor.appendChild(dia)
  }
}

async function seleccionarFecha(fechaStr, diaSemana, elemento) {
  document.querySelectorAll('.cal-dia').forEach(d => d.classList.remove('seleccionado'))
  elemento.classList.add('seleccionado')
  fechaSeleccionada = fechaStr
  horaSeleccionada = null
  document.getElementById('boton-agendar').style.display = 'none'
  const contenedorHoras = document.getElementById('horas-contenedor')
  contenedorHoras.innerHTML = '<p class="cargando">Cargando horas disponibles...</p>'
  document.getElementById('seccion-horas').style.display = 'block'
  const horasOcupadas = await obtenerHorasOcupadas(fechaStr)
  const turnos = diaSemana === 6 ? turnosSabado : turnosDomingo
  const ahora = new Date()
  const esHoy = fechaStr === ahora.toISOString().split('T')[0]
  contenedorHoras.innerHTML = ''
  turnos.forEach(turno => {
    const btn = document.createElement('button')
    btn.className = 'hora-btn'
    btn.textContent = turno
    btn.type = 'button'
    const ocupada = horasOcupadas.includes(turno)
    let pasada = false
    if (esHoy) {
      const [horaStr, periodo] = turno.split(' ')
      let [h, m] = horaStr.split(':').map(Number)
      if (periodo === 'PM' && h !== 12) h += 12
      if (periodo === 'AM' && h === 12) h = 0
      const turnoMin = h * 60 + m
      const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes() + 60
      if (turnoMin <= ahoraMin) pasada = true
    }
    if (ocupada || pasada) {
      btn.classList.add('hora-ocupada')
      btn.disabled = true
      btn.textContent = turno + ' · Ocupado'
    } else {
      btn.addEventListener('click', () => seleccionarHora(turno, btn))
    }
    contenedorHoras.appendChild(btn)
  })
}

function seleccionarHora(hora, elemento) {
  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('seleccionada'))
  elemento.classList.add('seleccionada')
  horaSeleccionada = hora
  document.getElementById('boton-agendar').style.display = 'block'
  actualizarTotal()
}

// ===== RESEÑAS =====
function renderEstrellas(numero) {
  return '★'.repeat(numero) + '☆'.repeat(5 - numero)
}

async function cargarResenas() {
  const resenas = await obtenerResenas()
  const gridResenas = document.getElementById('resenas-grid')
  const promedioNum = document.getElementById('promedio-numero')
  const promedioEst = document.getElementById('promedio-estrellas')
  const promedioTotal = document.getElementById('promedio-total')

  if (!resenas || resenas.length === 0) {
    gridResenas.innerHTML = '<p class="resenas-vacio">Sé el primero en dejar una reseña ✂️</p>'
    return
  }

  const suma = resenas.reduce((acc, r) => acc + r.estrellas, 0)
  const promedio = (suma / resenas.length).toFixed(1)
  promedioNum.textContent = promedio
  promedioEst.textContent = renderEstrellas(Math.round(promedio))
  promedioTotal.textContent = `${resenas.length} reseña${resenas.length > 1 ? 's' : ''}`

  gridResenas.innerHTML = ''
  resenas.forEach(r => {
    const card = document.createElement('div')
    card.className = 'resena-card'
    card.innerHTML = `
      <div class="resena-estrellas">${renderEstrellas(r.estrellas)}</div>
      <p class="resena-comentario">"${r.comentario}"</p>
      <span class="resena-autor">— ${r.nombre}</span>
    `
    gridResenas.appendChild(card)
  })

  // Duplicar para loop infinito
  gridResenas.innerHTML += gridResenas.innerHTML

  // Carrusel con touch y mouse
  const carrusel = gridResenas.parentElement

  let isDragging = false
  let startX = 0
  let scrollLeft = 0

  carrusel.addEventListener('touchstart', e => {
    isDragging = true
    startX = e.touches[0].pageX
    scrollLeft = carrusel.scrollLeft
    gridResenas.style.animationPlayState = 'paused'
  }, { passive: true })

  carrusel.addEventListener('touchend', () => {
    isDragging = false
    gridResenas.style.animationPlayState = 'running'
  })

  carrusel.addEventListener('touchmove', e => {
    if (!isDragging) return
    const x = e.touches[0].pageX
    const walk = (x - startX) * 1.5
    carrusel.scrollLeft = scrollLeft - walk
  }, { passive: true })

  carrusel.addEventListener('mousedown', e => {
    isDragging = true
    startX = e.pageX - carrusel.offsetLeft
    scrollLeft = carrusel.scrollLeft
    gridResenas.style.animationPlayState = 'paused'
    carrusel.style.cursor = 'grabbing'
  })

  carrusel.addEventListener('mouseup', () => {
    isDragging = false
    gridResenas.style.animationPlayState = 'running'
    carrusel.style.cursor = 'grab'
  })

  carrusel.addEventListener('mouseleave', () => {
    isDragging = false
    gridResenas.style.animationPlayState = 'running'
    carrusel.style.cursor = 'grab'
  })

  carrusel.addEventListener('mousemove', e => {
    if (!isDragging) return
    const x = e.pageX - carrusel.offsetLeft
    const walk = (x - startX) * 1.5
    carrusel.scrollLeft = scrollLeft - walk
  })
}

// ===== LÓGICA PRINCIPAL =====
document.addEventListener('DOMContentLoaded', () => {

  cargarResenas()

  // Estrellas
  document.querySelectorAll('.estrella-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      estrellaSeleccionada = parseInt(this.dataset.valor)
      document.querySelectorAll('.estrella-btn').forEach((b, i) => {
        b.classList.toggle('activa', i < estrellaSeleccionada)
      })
    })
  })

  // Envío reseña
  document.getElementById('form-resena').addEventListener('submit', async function(e) {
    e.preventDefault()
    if (estrellaSeleccionada === 0) {
      document.getElementById('error-estrellas').textContent = '⚠️ Selecciona una puntuación'
      document.getElementById('error-estrellas').style.display = 'block'
      return
    }
    document.getElementById('error-estrellas').style.display = 'none'
    const boton = document.getElementById('boton-resena')
    boton.textContent = 'Enviando...'
    boton.disabled = true
    const datos = {
      nombre: document.getElementById('resena-nombre').value,
      estrellas: estrellaSeleccionada,
      comentario: document.getElementById('resena-comentario').value,
      aprobada: false
    }
    const resultado = await guardarResena(datos)
    if (resultado.exito) {
      cerrarResena()
      this.reset()
      estrellaSeleccionada = 0
      alert('✅ ¡Gracias por tu reseña! Será publicada una vez revisada.')
    } else {
      alert('Hubo un error. Intenta de nuevo.')
    }
    boton.textContent = 'Enviar reseña'
    boton.disabled = false
  })

  // Validación teléfono
  const inputTelefono = document.getElementById('cita-telefono')
  inputTelefono.addEventListener('input', function() {
    const valor = this.value
    const errorMsg = document.getElementById('error-telefono')
    if (valor.length > 0 && valor[0] !== '3') {
      this.style.borderColor = '#c0392b'
      errorMsg.innerHTML = '⚠️ El número debe empezar por 3'
      errorMsg.style.display = 'block'
    } else if (valor.startsWith('3') && valor.length < 10) {
      this.style.borderColor = '#c0392b'
      errorMsg.innerHTML = '⚠️ El número debe tener 10 dígitos'
      errorMsg.style.display = 'block'
    } else {
      this.style.borderColor = '#2471a3'
      errorMsg.style.display = 'none'
    }
  })

  // Bloquear adiciones según servicio
  document.getElementById('cita-servicio').addEventListener('change', function() {
    const valor = this.value
    const incluyeBarba = valor === 'Corte + Barba'
    const incluyeCejas = valor === 'Corte + Cejas'
    const incluyeMasaje = valor === 'Corte + Masaje'
    const incluyeTodo = valor === 'Experiencia Gold'

    const checkBarba = document.querySelector('[data-nombre="Barba"]')
    const checkCejas = document.querySelector('[data-nombre="Cejas"]')
    const checkMask = document.querySelector('[data-nombre="Black Mask Nasal"]')
    const checkOcular = document.querySelector('[data-nombre="Masaje Ocular"]')

    function bloquear(checkbox, condicion) {
      const item = checkbox.closest('.adicion-item')
      if (condicion) {
        checkbox.checked = false
        checkbox.disabled = true
        item.style.opacity = '0.3'
        item.style.pointerEvents = 'none'
      } else {
        checkbox.disabled = false
        item.style.opacity = '1'
        item.style.pointerEvents = 'auto'
      }
    }

    bloquear(checkBarba, incluyeBarba || incluyeTodo)
    bloquear(checkCejas, incluyeCejas || incluyeTodo)
    bloquear(checkMask, incluyeTodo)
    bloquear(checkOcular, incluyeTodo || incluyeMasaje)
    actualizarTotal()
  })

  document.querySelectorAll('.adicion-checkbox').forEach(cb => {
    cb.addEventListener('change', actualizarTotal)
  })

  // Ubicación
  const selectUbicacion = document.getElementById('cita-ubicacion')
  selectUbicacion.addEventListener('change', function() {
    if (this.value === 'En la barbería') {
      document.getElementById('seccion-calendario').style.display = 'block'
      renderCalendario()
    }
    if (this.value === 'A domicilio (+$8.000)') {
      cerrarCitas()
      const mensaje = `Hola Edwin ✂️, quiero solicitar un *servicio a domicilio*. ¿Tienes disponibilidad? ¿Cuál es tu zona de cobertura?`
      window.open(`https://wa.me/573173475482?text=${encodeURIComponent(mensaje)}`, '_blank')
      this.value = ''
    }
  })

  // Envío citas
  document.getElementById('form-citas').addEventListener('submit', async function(e) {
    e.preventDefault()
    const telefono = document.getElementById('cita-telefono').value
    if (!telefono.startsWith('3') || telefono.length !== 10) {
      document.getElementById('error-telefono').innerHTML = '⚠️ El número debe empezar por 3 y tener 10 dígitos'
      document.getElementById('error-telefono').style.display = 'block'
      return
    }
    if (!fechaSeleccionada) { alert('Por favor selecciona un día en el calendario.'); return }
    if (!horaSeleccionada) { alert('Por favor selecciona una hora disponible.'); return }
    if (!document.getElementById('terminos-check').checked) {
      alert('Debes aceptar los términos y condiciones para continuar.')
      return
    }
    const boton = document.getElementById('boton-agendar')
    boton.textContent = 'Agendando...'
    boton.disabled = true
    const { total, adicionesSeleccionadas } = calcularTotal()
    const datos = {
      nombre: document.getElementById('cita-nombre').value,
      telefono,
      servicio: document.getElementById('cita-servicio').value,
      adiciones: adicionesSeleccionadas,
      ubicacion: document.getElementById('cita-ubicacion').value,
      fecha: fechaSeleccionada,
      hora: horaSeleccionada,
      total
    }
    const resultado = await guardarCita(datos)
    if (resultado.exito) {
      const fechaFormato = new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      const adicionesTexto = adicionesSeleccionadas.length > 0
        ? `➕ Adiciones: ${adicionesSeleccionadas.join(', ')}\n` : ''
      const mensaje =
        `Hola Edwin ✂️, quiero confirmar mi cita.\n\n` +
        `👤 Nombre: ${datos.nombre}\n` +
        `📱 Teléfono: ${datos.telefono}\n` +
        `✂️ Servicio: ${datos.servicio}\n` +
        `${adicionesTexto}` +
        `📍 Ubicación: ${datos.ubicacion}\n` +
        `📅 Fecha: ${fechaFormato}\n` +
        `🕐 Hora: ${datos.hora}\n` +
        `💰 Total: $${total.toLocaleString()}\n\n` +
        `¿Queda confirmada la cita?`
      cerrarCitas()
      this.reset()
      document.getElementById('seccion-horas').style.display = 'none'
      document.getElementById('seccion-calendario').style.display = 'none'
      document.getElementById('boton-agendar').style.display = 'none'
      window.open(`https://wa.me/573173475482?text=${encodeURIComponent(mensaje)}`, '_blank')
    } else {
      alert('Hubo un error. Intenta de nuevo.')
    }
    boton.disabled = false
    actualizarTotal()
  })

  // Scroll animaciones
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada, i) => {
      if (entrada.isIntersecting) {
        setTimeout(() => entrada.target.classList.add('visible'), i * 100)
        observador.unobserve(entrada.target)
      }
    })
  }, { threshold: 0.1 })
  document.querySelectorAll('.revelar').forEach(el => observador.observe(el))

  // Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarModal(); cerrarCitas(); cerrarResena() }
  })

})
