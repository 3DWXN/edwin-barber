// ===== IMPORTAR FIREBASE =====
import {
  guardarCita, obtenerHorasOcupadas, guardarResena, obtenerResenas,
  obtenerCitasPorTelefono, obtenerTodasLasCitas, obtenerCitasPorFecha,
  obtenerIngresosSemana, obtenerCitasPorRango, obtenerStatsDia, actualizarEstadoCita,
  iniciarSesionAdmin, sesionAdminActiva, cerrarSesionAdmin,
  bloquearFecha, desbloquearFecha, estaFechaBloqueada, obtenerFechasBloqueadas,
  obtenerConfigHorariosDB, guardarConfigHorariosDB,
  CONFIG_SLOTS
} from './firebase.js'

// ===== PRECIOS =====
const preciosServicios = {
  'Corte Básico': 20000,
  'Corte + Cejas': 24000,
  'Corte + Barba': 27000,
  'Corte + Masaje': 28000,
  'Experiencia Gold': 45000
}

// ===== ESTADO GLOBAL =====
let fechaSeleccionada = null
let horaSeleccionada = null
let estrellaSeleccionada = 0
let sesionCliente = null       // { nombre, telefono }
let fechaDash = new Date()     // fecha activa en dashboard
let fechaAgenda = new Date()   // fecha activa en agenda
let todasCitas = []            // cache de citas para el tab de todas
let offsetSemana = 0           // 0=semana actual, -1=anterior, +1=siguiente

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

// ================================================================
// NAVBAR — HAMBURGER
// ================================================================
window.toggleMenu = function () {
  const menu = document.getElementById('nav-menu')
  const btn = document.getElementById('nav-hamburger')
  menu.classList.toggle('abierto')
  btn.classList.toggle('abierto')
}

window.cerrarMenu = function () {
  document.getElementById('nav-menu').classList.remove('abierto')
  document.getElementById('nav-hamburger').classList.remove('abierto')
}

// Cierra menú al hacer clic fuera
document.addEventListener('click', (e) => {
  const menu = document.getElementById('nav-menu')
  const btn = document.getElementById('nav-hamburger')
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('abierto')
    btn.classList.remove('abierto')
  }
})

// ================================================================
// MODAL SESIÓN — ABRIR / CERRAR
// ================================================================
window.abrirSesion = function () {
  // Si admin activo, abrir panel directo
  if (sesionAdminActiva()) { abrirPanelAdmin(); return }
  // Si cliente activo, mostrar perfil
  if (sesionCliente) {
    mostrarPerfilCliente()
  } else {
    mostrarLoginCliente()
  }
  document.getElementById('modal-sesion').classList.add('abierto')
  document.body.style.overflow = 'hidden'
}

window.cerrarSesion = function () {
  document.getElementById('modal-sesion').classList.remove('abierto')
  document.body.style.overflow = ''
}

function mostrarVista(id) {
  ;['vista-login', 'vista-login-admin', 'vista-cliente'].forEach(v => {
    document.getElementById(v).style.display = v === id ? 'block' : 'none'
  })
}

window.mostrarLoginCliente = function () { mostrarVista('vista-login') }
window.mostrarLoginAdmin = function () {
  document.getElementById('admin-password').value = ''
  document.getElementById('admin-error').style.display = 'none'
  mostrarVista('vista-login-admin')
}

// ================================================================
// LOGIN CLIENTE
// ================================================================
window.loginCliente = function () {
  const nombre = document.getElementById('login-nombre').value.trim()
  const telefono = document.getElementById('login-telefono').value.trim()
  const errorEl = document.getElementById('login-error')

  if (!nombre) {
    errorEl.textContent = '⚠️ Ingresa tu nombre'
    errorEl.style.display = 'block'
    return
  }
  if (!telefono.startsWith('3') || telefono.length !== 10) {
    errorEl.textContent = '⚠️ Número inválido (debe empezar por 3 y tener 10 dígitos)'
    errorEl.style.display = 'block'
    return
  }
  errorEl.style.display = 'none'
  sesionCliente = { nombre, telefono }
  localStorage.setItem('eb_cliente', JSON.stringify(sesionCliente))
  actualizarBadgeSesion()
  mostrarPerfilCliente()
}

async function mostrarPerfilCliente () {
  mostrarVista('vista-cliente')
  document.getElementById('cliente-bienvenida').textContent = `Hola, ${sesionCliente.nombre.split(' ')[0]}! ✂️`
  const lista = document.getElementById('citas-cliente-lista')
  lista.innerHTML = '<p class="cargando">Cargando tus citas...</p>'
  lista.className = 'citas-cliente-lista'

  const citas = await obtenerCitasPorTelefono(sesionCliente.telefono)

  if (!citas || citas.length === 0) {
    lista.innerHTML = '<p class="citas-vacio">No tienes citas registradas aún.</p>'
    return
  }

  lista.innerHTML = ''
  citas.forEach(c => {
    const fechaFmt = c.fecha
      ? new Date(c.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
      : '—'
    const chipClass = `estado-chip-${c.estado || 'pendiente'}`
    const card = document.createElement('div')
    card.className = `cita-cliente-card estado-${c.estado || 'pendiente'}`
    card.innerHTML = `
      <p class="cita-cliente-fecha">${fechaFmt}</p>
      <p class="cita-cliente-servicio">${c.servicio}${c.adiciones && c.adiciones.length ? ' + Adiciones' : ''}</p>
      <p class="cita-cliente-hora">🕐 ${c.hora || '—'} · 📍 ${c.ubicacion || '—'}</p>
      ${c.total ? `<p class="cita-cliente-hora">💰 $${c.total.toLocaleString()}</p>` : ''}
      <span class="cita-cliente-estado ${chipClass}">${c.estado || 'pendiente'}</span>
    `
    lista.appendChild(card)
  })
}

window.logoutCliente = function () {
  sesionCliente = null
  localStorage.removeItem('eb_cliente')
  actualizarBadgeSesion()
  cerrarSesion()
}

function actualizarBadgeSesion () {
  const badge = document.getElementById('nav-sesion-badge')
  const btnSesion = document.getElementById('btn-sesion')
  const activo = sesionCliente || sesionAdminActiva()
  badge.style.display = activo ? 'block' : 'none'
  btnSesion.classList.toggle('activo', !!activo)
}

// ================================================================
// LOGIN ADMIN
// ================================================================
window.loginAdmin = function () {
  const pass = document.getElementById('admin-password').value
  const errorEl = document.getElementById('admin-error')
  if (iniciarSesionAdmin(pass)) {
    cerrarSesion()
    actualizarBadgeSesion()
    abrirPanelAdmin()
  } else {
    errorEl.textContent = '⚠️ Contraseña incorrecta'
    errorEl.style.display = 'block'
    document.getElementById('admin-password').value = ''
  }
}

// Enter en campo contraseña
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.loginAdmin()
  })
})

// ================================================================
// PANEL ADMIN
// ================================================================
function abrirPanelAdmin () {
  document.getElementById('panel-admin').style.display = 'block'
  document.body.style.overflow = 'hidden'
  fechaDash = new Date()
  fechaAgenda = new Date()
  cambiarTab('dashboard')
}

window.cerrarPanelAdmin = function () {
  cerrarSesionAdmin()
  actualizarBadgeSesion()
  document.getElementById('panel-admin').style.display = 'none'
  document.body.style.overflow = ''
}

window.cambiarTab = function (tab) {
  ;['dashboard', 'agenda', 'citas'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none'
  })
  document.querySelectorAll('.admin-tab').forEach((btn, i) => {
    btn.classList.toggle('activo', ['dashboard', 'agenda', 'citas'][i] === tab)
  })
  if (tab === 'dashboard') cargarDashboard()
  if (tab === 'agenda') cargarAgenda()
  if (tab === 'citas') cargarTodasCitas()
}

// ================================================================
// HELPER — fecha local sin bug de timezone
// ================================================================
function fechaLocal (date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ================================================================
// DASHBOARD
// ================================================================
async function cargarDashboard () {
  const fechaStr = fechaLocal(fechaDash)
  const hoyStr = fechaLocal(new Date())

  // Texto fecha
  document.getElementById('admin-fecha-texto').textContent =
    fechaDash.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  // Stats
  const stats = await obtenerStatsDia(fechaStr)
  if (stats) {
    document.getElementById('stat-ocupacion').textContent = `${stats.ocupacion}%`
    document.getElementById('stat-ocupacion-barra').style.width = `${stats.ocupacion}%`
    document.getElementById('stat-slots').textContent =
      stats.slotsDia > 0 ? `${stats.totalCitas} de ${stats.slotsDia} slots` : 'Día sin turnos'
    document.getElementById('stat-citas-dia').textContent =
      `${stats.totalCitas} / ${stats.slotsDia || '—'}`
    document.getElementById('stat-citas-barra').style.width =
      stats.slotsDia > 0 ? `${(stats.totalCitas / stats.slotsDia) * 100}%` : '0%'
    document.getElementById('stat-ingresos-dia').textContent =
      `$${stats.ingresosDia.toLocaleString()} hoy`

    // Lista citas del día
    const contenedor = document.getElementById('admin-citas-hoy')
    contenedor.innerHTML = ''
    if (stats.citas.length === 0) {
      contenedor.innerHTML = '<p class="admin-vacio">Sin citas para este día</p>'
    } else {
      stats.citas.forEach(c => {
        const row = document.createElement('div')
        row.className = 'admin-cita-row'
        row.innerHTML = `
          <span class="admin-cita-hora">${c.hora || '—'}</span>
          <div class="admin-cita-info">
            <p class="admin-cita-nombre">${c.nombre}</p>
            <p class="admin-cita-servicio">${c.servicio}${c.adiciones && c.adiciones.length ? ` + ${c.adiciones.length} adición(es)` : ''}</p>
          </div>
          <span class="admin-cita-total">$${(c.total || 0).toLocaleString()}</span>
        `
        contenedor.appendChild(row)
      })
    }
  }

  // Gráfica semanal navegable
  await cargarGraficaSemana()
}

async function cargarGraficaSemana () {
  const hoyStr = fechaLocal(new Date())
  const { dias, rangoTexto } = await obtenerIngresosSemana(offsetSemana)

  // Actualizar rango en la UI
  const subEl = document.querySelector('.admin-grafica-sub')
  if (subEl) {
    const esActual = offsetSemana === 0
    subEl.textContent = esActual ? `Esta semana · ${rangoTexto}` : rangoTexto
  }

  renderGrafica(dias, hoyStr)
}

function renderGrafica (dias, hoyStr) {
  const contenedor = document.getElementById('admin-grafica')
  contenedor.innerHTML = ''
  const maxVal = Math.max(...dias.map(d => d.total), 1)
  dias.forEach(d => {
    const altura = Math.max((d.total / maxVal) * 85, d.total > 0 ? 8 : 4)
    const esHoy = d.fecha === hoyStr
    const wrap = document.createElement('div')
    wrap.className = 'grafica-barra-wrap'
    wrap.innerHTML = `
      <span class="grafica-valor">${d.total > 0 ? '$' + Math.round(d.total / 1000) + 'k' : ''}</span>
      <div class="grafica-barra${esHoy ? ' hoy' : ''}" style="height:${altura}px" title="$${d.total.toLocaleString()}"></div>
      <span class="grafica-etiqueta">${d.etiqueta}${esHoy ? ' ●' : ''}</span>
    `
    contenedor.appendChild(wrap)
  })
}

// Navegación semanas en la gráfica
window.cambiarSemanaGrafica = async function (delta) {
  offsetSemana += delta
  await cargarGraficaSemana()
}

window.cambiarFechaDash = function (delta) {
  fechaDash.setDate(fechaDash.getDate() + delta)
  cargarDashboard()
}

// ================================================================
// EXPORTAR EXCEL
// ================================================================
window.abrirExportarExcel = function () {
  document.getElementById('modal-excel').classList.add('abierto')
  document.body.style.overflow = 'hidden'
  // Defaults: primer día del mes actual al hoy
  const hoy = fechaLocal(new Date())
  const primerDia = hoy.substring(0, 7) + '-01'
  document.getElementById('excel-fecha-inicio').value = primerDia
  document.getElementById('excel-fecha-fin').value = hoy
}

window.cerrarExportarExcel = function () {
  document.getElementById('modal-excel').classList.remove('abierto')
  document.body.style.overflow = ''
}

window.generarExcel = async function () {
  const inicio = document.getElementById('excel-fecha-inicio').value
  const fin = document.getElementById('excel-fecha-fin').value
  if (!inicio || !fin) { alert('Selecciona un rango de fechas.'); return }
  if (inicio > fin) { alert('La fecha de inicio no puede ser mayor a la de fin.'); return }

  const btn = document.getElementById('btn-generar-excel')
  btn.textContent = '⏳ Generando...'
  btn.disabled = true

  const citas = await obtenerCitasPorRango(inicio, fin)

  if (citas.length === 0) {
    alert('No hay citas en ese rango de fechas.')
    btn.textContent = '⬇️ Descargar Excel'
    btn.disabled = false
    return
  }

  // Importar SheetJS dinámicamente
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')

  // ===== HOJA 1: TABLA DE DATOS =====
  const encabezados = ['Fecha', 'Hora', 'Nombre', 'Teléfono', 'Servicio', 'Adiciones', 'Ubicación', 'Total ($)', 'Estado']
  const filas = citas.map(c => [
    c.fecha ? new Date(c.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—',
    c.hora || '—',
    c.nombre || '—',
    c.telefono || '—',
    c.servicio || '—',
    c.adiciones && c.adiciones.length ? c.adiciones.join(', ') : '—',
    c.ubicacion || '—',
    c.total || 0,
    c.estado || 'pendiente'
  ])

  const totalGeneral = citas.reduce((sum, c) => sum + (c.total || 0), 0)
  const filaTotal = ['', '', '', '', '', '', 'TOTAL', totalGeneral, '']

  const datosHoja1 = [encabezados, ...filas, [], filaTotal]
  const hoja1 = XLSX.utils.aoa_to_sheet(datosHoja1)

  // Ancho de columnas
  hoja1['!cols'] = [
    { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 14 },
    { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 }
  ]

  // ===== HOJA 2: INGRESOS POR DÍA CON TOTAL Y GUÍA DE GRÁFICA =====
  const mapaFechas = {}
  citas.forEach(c => {
    if (c.fecha) {
      if (!mapaFechas[c.fecha]) mapaFechas[c.fecha] = { citas: 0, total: 0 }
      mapaFechas[c.fecha].citas++
      mapaFechas[c.fecha].total += c.total || 0
    }
  })

  const encabezadosGrafica = ['Fecha', 'Día', 'Cantidad de citas', 'Ingresos ($)']
  const filasGrafica = Object.entries(mapaFechas).sort().map(([fecha, datos]) => [
    fecha,
    new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }),
    datos.citas,
    datos.total
  ])

  const totalCitasGeneral = filasGrafica.reduce((s, f) => s + f[2], 0)
  const totalIngresosGeneral = filasGrafica.reduce((s, f) => s + f[3], 0)
  const filaTotalGrafica = ['', 'TOTAL', totalCitasGeneral, totalIngresosGeneral]

  const numFilasDatos = filasGrafica.length

  // Guía para crear la gráfica en Excel
  const guia = [
    [],
    ['📊 CÓMO CREAR LA GRÁFICA EN EXCEL:'],
    ['1. Selecciona las columnas B (Día) y D (Ingresos) desde la fila 2 hasta la fila ' + (numFilasDatos + 1)],
    ['2. Ve a "Insertar" → "Gráfico de columnas" → "Columna agrupada"'],
    ['3. ¡Listo! Tendrás la gráfica de ingresos por día'],
  ]

  const datosHoja2 = [encabezadosGrafica, ...filasGrafica, [], filaTotalGrafica, ...guia]
  const hoja2 = XLSX.utils.aoa_to_sheet(datosHoja2)
  hoja2['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 14 }]

  // Crear libro y agregar hojas
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja1, 'Citas')
  XLSX.utils.book_append_sheet(libro, hoja2, 'Ingresos por día')

  // Nombre del archivo
  const nombreArchivo = `EdwinBarber_${inicio}_al_${fin}.xlsx`
  XLSX.writeFile(libro, nombreArchivo)

  btn.textContent = '⬇️ Descargar Excel'
  btn.disabled = false
  cerrarExportarExcel()
}

// ================================================================
// AGENDA
// ================================================================
async function cargarAgenda () {
  const fechaStr = fechaLocal(fechaAgenda)
  document.getElementById('agenda-fecha-texto').textContent =
    fechaAgenda.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const timeline = document.getElementById('agenda-timeline')
  timeline.innerHTML = '<p class="cargando">Cargando agenda...</p>'

  // Actualizar botón bloqueo
  await actualizarBotonBloqueo()

  const bloqueada = await estaFechaBloqueada(fechaStr)

  const diaSemana = fechaAgenda.getDay()
  const turnos = diaSemana === 6
    ? CONFIG_SLOTS.sabado.turnos
    : diaSemana === 0
      ? CONFIG_SLOTS.domingo.turnos
      : []

  const citas = await obtenerCitasPorFecha(fechaStr)
  const citasPorHora = {}
  citas.forEach(c => { citasPorHora[c.hora] = c })

  timeline.innerHTML = ''

  // Banner de bloqueado
  if (bloqueada) {
    const banner = document.createElement('div')
    banner.className = 'agenda-bloqueado-banner'
    banner.textContent = '🔒 Este día está bloqueado — los clientes no pueden reservar'
    timeline.appendChild(banner)
  }

  if (turnos.length === 0) {
    timeline.innerHTML += '<p class="admin-vacio">Este día no tiene turnos configurados.</p>'
    return
  }

  turnos.forEach((turno, idx) => {
    const cita = citasPorHora[turno]
    const slot = document.createElement('div')
    slot.className = 'agenda-slot'

    const lineaHtml = `
      <div class="agenda-slot-linea">
        <div class="agenda-slot-punto" style="background:${cita ? estadoColor(cita.estado) : bloqueada ? '#e74c3c44' : '#1e3a52'}"></div>
        ${idx < turnos.length - 1 ? '<div class="agenda-slot-linea-v"></div>' : ''}
      </div>
    `

    if (cita) {
      slot.innerHTML = `
        <span class="agenda-slot-hora">${turno}</span>
        ${lineaHtml}
        <div class="agenda-cita-card estado-${cita.estado || 'pendiente'}">
          <p class="agenda-cita-nombre">${cita.nombre}</p>
          <p class="agenda-cita-servicio">${cita.servicio}${cita.adiciones && cita.adiciones.length ? ` · ${cita.adiciones.join(', ')}` : ''}</p>
          <div class="agenda-cita-meta">
            <span class="agenda-cita-total">$${(cita.total || 0).toLocaleString()}</span>
            <select class="agenda-estado-select" data-id="${cita.id}" onchange="cambiarEstadoCita(this)">
              <option value="pendiente" ${cita.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="confirmada" ${cita.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
              <option value="completada" ${cita.estado === 'completada' ? 'selected' : ''}>Completada</option>
              <option value="cancelada" ${cita.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
            </select>
          </div>
          <p style="font-size:11px;color:#5d8aa8;margin-top:4px;">📱 ${cita.telefono || '—'}</p>
        </div>
      `
    } else {
      slot.innerHTML = `
        <span class="agenda-slot-hora">${turno}</span>
        ${lineaHtml}
        <div class="agenda-slot-libre" style="${bloqueada ? 'opacity:0.35;' : ''}">
          <span class="agenda-slot-libre-txt">${bloqueada ? '🔒 Bloqueado' : 'Disponible'}</span>
        </div>
      `
    }
    timeline.appendChild(slot)
  })
}

function estadoColor (estado) {
  const colores = {
    pendiente: '#2471a3',
    confirmada: '#f39c12',
    completada: '#27ae60',
    cancelada: '#e74c3c'
  }
  return colores[estado] || '#1e3a52'
}

window.cambiarFechaAgenda = function (delta) {
  fechaAgenda.setDate(fechaAgenda.getDate() + delta)
  cargarAgenda()
}

// ================================================================
// BLOQUEO DE FECHAS
// ================================================================
window.toggleBloquearFecha = async function () {
  const fechaStr = fechaLocal(fechaAgenda)
  const btn = document.getElementById('btn-bloquear-fecha')
  btn.disabled = true

  const bloqueada = await estaFechaBloqueada(fechaStr)

  if (bloqueada) {
    const confirmar = confirm(`¿Desbloquear el ${fechaAgenda.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}? Los clientes podrán reservar de nuevo.`)
    if (!confirmar) { btn.disabled = false; return }
    await desbloquearFecha(fechaStr)
  } else {
    const confirmar = confirm(`¿Bloquear el ${fechaAgenda.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}? Los clientes NO podrán reservar ese día.`)
    if (!confirmar) { btn.disabled = false; return }
    await bloquearFecha(fechaStr)
  }

  btn.disabled = false
  cargarAgenda()
}

async function actualizarBotonBloqueo () {
  const fechaStr = fechaLocal(fechaAgenda)
  const btn = document.getElementById('btn-bloquear-fecha')
  if (!btn) return
  const bloqueada = await estaFechaBloqueada(fechaStr)
  if (bloqueada) {
    btn.textContent = '🔓 Desbloquear este día'
    btn.classList.add('desbloqueado')
  } else {
    btn.textContent = '🔒 Bloquear este día'
    btn.classList.remove('desbloqueado')
  }
}

window.cambiarEstadoCita = async function (select) {
  const id = select.dataset.id
  const nuevoEstado = select.value
  select.disabled = true
  const resultado = await actualizarEstadoCita(id, nuevoEstado)
  select.disabled = false
  if (resultado.exito) {
    const card = select.closest('.agenda-cita-card')
    if (card) card.className = `agenda-cita-card estado-${nuevoEstado}`
    // Si confirma, abrir WhatsApp con mensaje listo
    if (nuevoEstado === 'confirmada') {
      const cita = extraerDatosCitaDeCard(card, id)
      abrirWhatsAppConfirmacion(cita)
    }
  } else {
    alert('Error al actualizar el estado.')
    cargarAgenda()
  }
}

// ================================================================
// TODAS LAS CITAS
// ================================================================
async function cargarTodasCitas () {
  const lista = document.getElementById('todas-citas-lista')
  lista.innerHTML = '<p class="cargando">Cargando citas...</p>'
  todasCitas = await obtenerTodasLasCitas()
  renderTodasCitas()

  document.getElementById('filtro-estado').onchange = renderTodasCitas
}

function renderTodasCitas () {
  const lista = document.getElementById('todas-citas-lista')
  const filtro = document.getElementById('filtro-estado').value
  const filtradas = filtro ? todasCitas.filter(c => c.estado === filtro) : todasCitas

  if (filtradas.length === 0) {
    lista.innerHTML = '<p class="admin-vacio">No hay citas con este filtro.</p>'
    return
  }

  lista.innerHTML = ''
  filtradas.forEach(c => {
    const fechaFmt = c.fecha
      ? new Date(c.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      : '—'
    const card = document.createElement('div')
    card.className = `admin-cita-card-full estado-${c.estado || 'pendiente'}`
    card.innerHTML = `
      <div class="admin-cita-card-header">
        <span class="admin-cita-card-nombre">${c.nombre}</span>
        <span class="admin-cita-card-fecha">${fechaFmt} · ${c.hora || '—'}</span>
      </div>
      <div class="admin-cita-card-body">
        Servicio: <span>${c.servicio}</span><br>
        ${c.adiciones && c.adiciones.length ? `Adiciones: <span>${c.adiciones.join(', ')}</span><br>` : ''}
        WhatsApp: <span>${c.telefono || '—'}</span><br>
        Ubicación: <span>${c.ubicacion || '—'}</span>
      </div>
      <div class="admin-cita-card-footer">
        <span class="admin-cita-card-total">$${(c.total || 0).toLocaleString()}</span>
        <select class="agenda-estado-select" data-id="${c.id}" onchange="cambiarEstadoDesdeListado(this)">
          <option value="pendiente" ${c.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="confirmada" ${c.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
          <option value="completada" ${c.estado === 'completada' ? 'selected' : ''}>Completada</option>
          <option value="cancelada" ${c.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
        </select>
      </div>
    `
    lista.appendChild(card)
  })
}

window.cambiarEstadoDesdeListado = async function (select) {
  const id = select.dataset.id
  const nuevoEstado = select.value
  select.disabled = true
  const resultado = await actualizarEstadoCita(id, nuevoEstado)
  select.disabled = false
  if (resultado.exito) {
    const card = select.closest('.admin-cita-card-full')
    if (card) card.className = `admin-cita-card-full estado-${nuevoEstado}`
    const cita = todasCitas.find(c => c.id === id)
    if (cita) {
      cita.estado = nuevoEstado
      if (nuevoEstado === 'confirmada') abrirWhatsAppConfirmacion(cita)
    }
  } else {
    alert('Error al actualizar el estado.')
  }
}

// ================================================================
// WHATSAPP — MENSAJE DE CONFIRMACIÓN
// ================================================================
function extraerDatosCitaDeCard (card, id) {
  // Extrae nombre, servicio, teléfono del card visual de la agenda
  const nombre = card.querySelector('.agenda-cita-nombre')?.textContent || ''
  const servicio = card.querySelector('.agenda-cita-servicio')?.textContent || ''
  const telefonoEl = card.querySelector('p[style]')
  const telefonoRaw = telefonoEl?.textContent?.replace('📱', '').trim() || ''
  const telefono = telefonoRaw === '—' ? '' : telefonoRaw
  // Hora la tomamos del slot padre
  const slot = card.closest('.agenda-slot')
  const hora = slot?.querySelector('.agenda-slot-hora')?.textContent || ''
  // Fecha de la agenda activa
  const fecha = fechaLocal(fechaAgenda)
  const fechaFmt = fechaAgenda.toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  return { id, nombre, servicio, telefono, hora, fecha, fechaFmt }
}

function abrirWhatsApp (url) {
  // Funciona en Safari/iPhone sin ser bloqueado como popup
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.target = '_blank'
  enlace.rel = 'noopener noreferrer'
  document.body.appendChild(enlace)
  enlace.click()
  setTimeout(() => document.body.removeChild(enlace), 300)
}

window.agendarDomicilio = function () {
  const msg = `Hola Edwin ✂️, quiero agendar un *servicio a domicilio*. ¿Tienes disponibilidad? ¿Cuál es tu zona de cobertura?`
  abrirWhatsApp(`https://wa.me/573173475482?text=${encodeURIComponent(msg)}`)
}

function abrirWhatsAppConfirmacion (cita) {
  if (!cita.telefono) return
  const fechaFmt = cita.fechaFmt || (() => {
    const d = new Date(cita.fecha + 'T12:00:00')
    return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  })()
  const mensaje =
    `Hola ${cita.nombre} 👋, te confirmo tu cita:\n\n` +
    `✂️ Servicio: ${cita.servicio}\n` +
    `📅 Fecha: ${fechaFmt}\n` +
    `🕐 Hora: ${cita.hora}\n\n` +
    `Si necesitas cancelar, avísame con al menos 1 hora de anticipación.\n` +
    `¡Te espero! 💈`
  const telefono = cita.telefono.startsWith('57') ? cita.telefono : `57${cita.telefono}`
  abrirWhatsApp(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`)
}

// ================================================================
// MODALES DE SERVICIOS
// ================================================================
window.abrirServicio = function (id) {
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
  // Guardar el nombre del servicio en el botón para pasarlo al abrir citas
  const btnAgendar = document.querySelector('#modal-servicio .boton-principal')
  if (btnAgendar) btnAgendar.onclick = () => { cerrarModal(); abrirCitas(s.titulo) }
  document.getElementById('modal-servicio').classList.add('abierto')
  document.body.style.overflow = 'hidden'
}

window.cerrarModal = function () {
  document.getElementById('modal-servicio').classList.remove('abierto')
  document.body.style.overflow = ''
}

// ================================================================
// MODAL CITAS
// ================================================================
window.abrirCitas = function (servicioPreseleccionado = null) {
  fechaSeleccionada = null
  horaSeleccionada = null
  document.getElementById('modal-citas').classList.add('abierto')
  document.body.style.overflow = 'hidden'
  document.getElementById('seccion-calendario').style.display = 'none'
  document.getElementById('seccion-horas').style.display = 'none'
  document.getElementById('boton-agendar').style.display = 'none'

  // Preseleccionar servicio si viene desde una tarjeta
  const selectServicio = document.getElementById('cita-servicio')
  if (servicioPreseleccionado && selectServicio) {
    // Buscar la opción que coincida
    const opcion = Array.from(selectServicio.options).find(o =>
      o.value === servicioPreseleccionado || o.value.startsWith(servicioPreseleccionado)
    )
    if (opcion) {
      selectServicio.value = opcion.value
      selectServicio.dispatchEvent(new Event('change'))
    }
  } else if (selectServicio) {
    selectServicio.value = ''
  }
}

window.cerrarCitas = function () {
  document.getElementById('modal-citas').classList.remove('abierto')
  document.body.style.overflow = ''
}

// ================================================================
// MODAL RESEÑA
// ================================================================
window.abrirResena = function () {
  estrellaSeleccionada = 0
  document.querySelectorAll('.estrella-btn').forEach(e => e.classList.remove('activa'))
  document.getElementById('modal-resena').classList.add('abierto')
  document.body.style.overflow = 'hidden'
}

window.cerrarResena = function () {
  document.getElementById('modal-resena').classList.remove('abierto')
  document.body.style.overflow = ''
}

// ================================================================
// TOTAL DE CITA
// ================================================================
function calcularTotal () {
  const servicioSeleccionado = document.getElementById('cita-servicio').value
  const precioBase = preciosServicios[servicioSeleccionado] || 0
  let totalAdiciones = 0
  const adicionesSeleccionadas = []
  document.querySelectorAll('.adicion-checkbox:checked').forEach(cb => {
    totalAdiciones += parseInt(cb.dataset.precio)
    adicionesSeleccionadas.push(`${cb.dataset.nombre} ($${parseInt(cb.dataset.precio).toLocaleString()})`)
  })
  const ubicacion = document.getElementById('cita-ubicacion').value
  const domicilio = ubicacion === 'A domicilio (+$8.000)' ? 8000 : 0
  return { total: precioBase + totalAdiciones + domicilio, adicionesSeleccionadas }
}

function actualizarTotal () {
  const { total } = calcularTotal()
  const boton = document.getElementById('boton-agendar')
  if (boton.style.display !== 'none') {
    boton.textContent = total > 0
      ? `Confirmar cita — $${total.toLocaleString()}`
      : 'Confirmar cita'
  }
}

// ================================================================
// CALENDARIO (cliente) — respeta fechas bloqueadas y días config
// ================================================================
async function renderCalendario () {
  const contenedor = document.getElementById('calendario')
  contenedor.innerHTML = '<p class="cargando">Cargando disponibilidad...</p>'

  const [fechasBloqueadas, config] = await Promise.all([
    obtenerFechasBloqueadas(),
    obtenerConfigHorarios()
  ])

  contenedor.innerHTML = ''
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  let diasMostrados = 0
  for (let i = 0; i < 60 && diasMostrados < 12; i++) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + i)
    const diaSemana = fecha.getDay()
    const nombreCorto = ['dom','lun','mar','mie','jue','vie','sab'][diaSemana]
    const diaConfig = config[nombreCorto]
    if (!diaConfig || !diaConfig.activo) continue

    const fechaStr = fechaLocal(fecha)
    const bloqueada = fechasBloqueadas.includes(fechaStr)
    if (bloqueada) continue // no mostrar días bloqueados al cliente

    const dia = document.createElement('div')
    dia.className = 'cal-dia'
    const nombreDia = fecha.toLocaleString('es', { weekday: 'short' })
    dia.innerHTML = `
      <span class="cal-nombre">${nombreDia}</span>
      <span class="cal-numero">${fecha.getDate()}</span>
      <span class="cal-mes">${fecha.toLocaleString('es', { month: 'short' })}</span>
    `
    dia.addEventListener('click', () => seleccionarFecha(fechaStr, diaSemana, dia, diaConfig.horas))
    contenedor.appendChild(dia)
    diasMostrados++
  }

  if (diasMostrados === 0) {
    contenedor.innerHTML = '<p class="cargando">No hay días disponibles por el momento.</p>'
  }
}

async function seleccionarFecha (fechaStr, diaSemana, elemento, horasConfig = null) {
  document.querySelectorAll('.cal-dia').forEach(d => d.classList.remove('seleccionado'))
  elemento.classList.add('seleccionado')
  fechaSeleccionada = fechaStr
  horaSeleccionada = null
  document.getElementById('boton-agendar').style.display = 'none'
  const contenedorHoras = document.getElementById('horas-contenedor')
  contenedorHoras.innerHTML = '<p class="cargando">Cargando horas disponibles...</p>'
  document.getElementById('seccion-horas').style.display = 'block'
  const horasOcupadas = await obtenerHorasOcupadas(fechaStr)
  // Usar horas de la config si vienen, si no usar CONFIG_SLOTS legacy
  const turnos = horasConfig || (diaSemana === 6 ? CONFIG_SLOTS.sabado.turnos : CONFIG_SLOTS.domingo.turnos)
  const ahora = new Date()
  const esHoy = fechaStr === fechaLocal(new Date())
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

function seleccionarHora (hora, elemento) {
  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('seleccionada'))
  elemento.classList.add('seleccionada')
  horaSeleccionada = hora
  document.getElementById('boton-agendar').style.display = 'block'
  actualizarTotal()
}

// ================================================================
// RESEÑAS
// ================================================================
function renderEstrellas (numero) {
  return '★'.repeat(numero) + '☆'.repeat(5 - numero)
}

async function cargarResenas () {
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
  gridResenas.innerHTML += gridResenas.innerHTML

  // Carrusel touch + mouse
  const carrusel = gridResenas.parentElement
  let isDragging = false, startX = 0, scrollLeft = 0
  carrusel.addEventListener('touchstart', e => {
    isDragging = true; startX = e.touches[0].pageX; scrollLeft = carrusel.scrollLeft
    gridResenas.style.animationPlayState = 'paused'
  }, { passive: true })
  carrusel.addEventListener('touchend', () => { isDragging = false; gridResenas.style.animationPlayState = 'running' })
  carrusel.addEventListener('touchmove', e => {
    if (!isDragging) return
    carrusel.scrollLeft = scrollLeft - (e.touches[0].pageX - startX) * 1.5
  }, { passive: true })
  carrusel.addEventListener('mousedown', e => {
    isDragging = true; startX = e.pageX - carrusel.offsetLeft; scrollLeft = carrusel.scrollLeft
    gridResenas.style.animationPlayState = 'paused'; carrusel.style.cursor = 'grabbing'
  })
  carrusel.addEventListener('mouseup', () => { isDragging = false; gridResenas.style.animationPlayState = 'running'; carrusel.style.cursor = 'grab' })
  carrusel.addEventListener('mouseleave', () => { isDragging = false; gridResenas.style.animationPlayState = 'running'; carrusel.style.cursor = 'grab' })
  carrusel.addEventListener('mousemove', e => {
    if (!isDragging) return
    carrusel.scrollLeft = scrollLeft - (e.pageX - carrusel.offsetLeft - startX) * 1.5
  })
}

// ================================================================
// CONFIGURACIÓN DE HORARIOS (desde Firebase)
// ================================================================
const CONFIG_HORARIOS_DEFAULT = {
  sab: { activo: true,  nombre: 'Sábado',    horas: CONFIG_SLOTS.sabado.turnos },
  dom: { activo: true,  nombre: 'Domingo',   horas: CONFIG_SLOTS.domingo.turnos },
  lun: { activo: false, nombre: 'Lunes',     horas: [] },
  mar: { activo: false, nombre: 'Martes',    horas: [] },
  mie: { activo: false, nombre: 'Miércoles', horas: [] },
  jue: { activo: false, nombre: 'Jueves',    horas: [] },
  vie: { activo: false, nombre: 'Viernes',   horas: [] },
}

// Cache local de la config
let configHorarios = null

async function obtenerConfigHorarios () {
  if (configHorarios) return configHorarios
  const data = await obtenerConfigHorariosDB()
  configHorarios = data || CONFIG_HORARIOS_DEFAULT
  return configHorarios
}

async function guardarConfigHorarios (config) {
  const ok = await guardarConfigHorariosDB(config)
  if (ok) configHorarios = config
  return ok
}

// ================================================================
// PANEL DISPONIBILIDAD ADMIN
// ================================================================
window.cambiarTab = function (tab) {
  ;['dashboard', 'agenda', 'citas', 'disponibilidad'].forEach(t => {
    const el = document.getElementById(`tab-${t}`)
    if (el) el.style.display = t === tab ? 'block' : 'none'
  })
  document.querySelectorAll('.admin-tab').forEach((btn, i) => {
    btn.classList.toggle('activo', ['dashboard', 'agenda', 'citas', 'disponibilidad'][i] === tab)
  })
  if (tab === 'dashboard') cargarDashboard()
  if (tab === 'agenda') cargarAgenda()
  if (tab === 'citas') cargarTodasCitas()
  if (tab === 'disponibilidad') cargarPanelDisponibilidad()
}

async function cargarPanelDisponibilidad () {
  const contenedor = document.getElementById('tab-disponibilidad')
  contenedor.innerHTML = '<p class="cargando">Cargando configuración...</p>'

  const [config, bloqueadas] = await Promise.all([
    obtenerConfigHorarios(),
    obtenerFechasBloqueadas()
  ])

  const dias = ['lun','mar','mie','jue','vie','sab','dom']
  const hoy = new Date()

  let html = `
    <div class="disp-seccion">
      <h3 class="disp-titulo">📅 Días y horarios de trabajo</h3>
      <p class="disp-sub">Activa los días que trabajas y define las horas disponibles.</p>
      <div class="disp-dias-grid" id="disp-dias-grid">
  `

  dias.forEach(d => {
    const diaConf = config[d] || { activo: false, nombre: d, horas: [] }
    html += `
      <div class="disp-dia-card ${diaConf.activo ? 'activo' : ''}" id="dcard-${d}">
        <div class="disp-dia-header">
          <span class="disp-dia-nombre">${diaConf.nombre}</span>
          <label class="disp-toggle">
            <input type="checkbox" ${diaConf.activo ? 'checked' : ''} onchange="toggleDia('${d}', this.checked)">
            <span class="disp-toggle-slider"></span>
          </label>
        </div>
        <div class="disp-horas-wrap" id="dhoras-${d}" style="${diaConf.activo ? '' : 'display:none'}">
          <textarea class="campo-input disp-horas-input" id="dinput-${d}" 
            placeholder="2:00 PM, 2:40 PM, 3:20 PM..."
            rows="3">${(diaConf.horas || []).join(', ')}</textarea>
          <p class="campo-nota">Separa las horas con coma. Formato: 2:00 PM</p>
        </div>
      </div>
    `
  })

  html += `</div>
    <button class="boton-principal" style="max-width:300px;margin:20px auto;display:block;" onclick="guardarHorarios()">
      💾 Guardar horarios
    </button>
  </div>

  <div class="disp-seccion">
    <h3 class="disp-titulo">🔒 Bloquear fechas específicas</h3>
    <p class="disp-sub">Bloquea días puntuales (vacaciones, festivos, etc). Los clientes no podrán reservar esos días.</p>

    <div class="disp-bloqueo-form">
      <input class="campo-input" type="date" id="input-fecha-bloquear" style="max-width:200px;">
      <button class="boton-principal" style="max-width:160px;" onclick="agregarFechaBloqueada()">+ Bloquear</button>
    </div>

    <div class="disp-fechas-bloqueadas" id="disp-fechas-bloqueadas">
      ${bloqueadas.length === 0
        ? '<p class="admin-vacio">No hay fechas bloqueadas.</p>'
        : bloqueadas.sort().map(f => `
          <div class="disp-fecha-chip">
            <span>${new Date(f + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <button class="disp-chip-del" onclick="quitarFechaBloqueada('${f}')">✕</button>
          </div>
        `).join('')
      }
    </div>
  </div>`

  contenedor.innerHTML = html
}

window.toggleDia = function (dia, activo) {
  const card = document.getElementById(`dcard-${dia}`)
  const wrap = document.getElementById(`dhoras-${dia}`)
  card.classList.toggle('activo', activo)
  wrap.style.display = activo ? 'block' : 'none'
}

window.guardarHorarios = async function () {
  const dias = ['lun','mar','mie','jue','vie','sab','dom']
  const nombres = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' }
  const nueva = {}
  dias.forEach(d => {
    const cb = document.querySelector(`#dcard-${d} input[type=checkbox]`)
    const activo = cb ? cb.checked : false
    const inputVal = document.getElementById(`dinput-${d}`)?.value || ''
    const horas = inputVal.split(',').map(h => h.trim()).filter(h => h.length > 0)
    nueva[d] = { activo, nombre: nombres[d], horas }
  })
  const ok = await guardarConfigHorarios(nueva)
  if (ok) {
    alert('✅ Horarios guardados correctamente.')
  } else {
    alert('Hubo un error al guardar. Intenta de nuevo.')
  }
}

window.agregarFechaBloqueada = async function () {
  const input = document.getElementById('input-fecha-bloquear')
  const fecha = input.value
  if (!fecha) { alert('Selecciona una fecha.'); return }
  await bloquearFecha(fecha)
  input.value = ''
  cargarPanelDisponibilidad()
}

window.quitarFechaBloqueada = async function (fecha) {
  await desbloquearFecha(fecha)
  cargarPanelDisponibilidad()
}

// ================================================================
// LÓGICA PRINCIPAL — DOMContentLoaded
// ================================================================
document.addEventListener('DOMContentLoaded', () => {

  // Restaurar sesión cliente de localStorage
  const clienteGuardado = localStorage.getItem('eb_cliente')
  if (clienteGuardado) {
    try { sesionCliente = JSON.parse(clienteGuardado) } catch (e) { sesionCliente = null }
  }
  actualizarBadgeSesion()

  // Si admin tenía sesión activa (sessionStorage persiste mientras el tab esté abierto)
  if (sesionAdminActiva()) actualizarBadgeSesion()

  cargarResenas()

  // Estrellas reseña
  document.querySelectorAll('.estrella-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      estrellaSeleccionada = parseInt(this.dataset.valor)
      document.querySelectorAll('.estrella-btn').forEach((b, i) => {
        b.classList.toggle('activa', i < estrellaSeleccionada)
      })
    })
  })

  // Envío reseña
  document.getElementById('form-resena').addEventListener('submit', async function (e) {
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
    const resultado = await guardarResena({
      nombre: document.getElementById('resena-nombre').value,
      estrellas: estrellaSeleccionada,
      comentario: document.getElementById('resena-comentario').value,
      aprobada: false
    })
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

  // Validación teléfono citas
  document.getElementById('cita-telefono').addEventListener('input', function () {
    const errorMsg = document.getElementById('error-telefono')
    if (this.value.length > 0 && this.value[0] !== '3') {
      this.style.borderColor = '#c0392b'
      errorMsg.innerHTML = '⚠️ El número debe empezar por 3'
      errorMsg.style.display = 'block'
    } else if (this.value.startsWith('3') && this.value.length < 10) {
      this.style.borderColor = '#c0392b'
      errorMsg.innerHTML = '⚠️ El número debe tener 10 dígitos'
      errorMsg.style.display = 'block'
    } else {
      this.style.borderColor = '#2471a3'
      errorMsg.style.display = 'none'
    }
  })

  // Bloquear adiciones según servicio
  document.getElementById('cita-servicio').addEventListener('change', function () {
    const v = this.value
    const checkBarba = document.querySelector('[data-nombre="Barba"]')
    const checkCejas = document.querySelector('[data-nombre="Cejas"]')
    const checkMask = document.querySelector('[data-nombre="Black Mask Nasal"]')
    const checkOcular = document.querySelector('[data-nombre="Masaje Ocular"]')
    function bloquear (cb, cond) {
      const item = cb.closest('.adicion-item')
      cb.checked = cond ? false : cb.checked
      cb.disabled = cond
      item.style.opacity = cond ? '0.3' : '1'
      item.style.pointerEvents = cond ? 'none' : 'auto'
    }
    bloquear(checkBarba, v === 'Corte + Barba' || v === 'Experiencia Gold')
    bloquear(checkCejas, v === 'Corte + Cejas' || v === 'Experiencia Gold')
    bloquear(checkMask, v === 'Experiencia Gold')
    bloquear(checkOcular, v === 'Experiencia Gold' || v === 'Corte + Masaje')
    actualizarTotal()
  })

  document.querySelectorAll('.adicion-checkbox').forEach(cb => {
    cb.addEventListener('change', actualizarTotal)
  })

  // Ubicación
  document.getElementById('cita-ubicacion').addEventListener('change', function () {
    if (this.value === 'En la barbería') {
      document.getElementById('seccion-calendario').style.display = 'block'
      renderCalendario()
    }
    if (this.value === 'A domicilio (+$8.000)') {
      cerrarCitas()
      const msg = `Hola Edwin ✂️, quiero solicitar un *servicio a domicilio*. ¿Tienes disponibilidad? ¿Cuál es tu zona de cobertura?`
      abrirWhatsApp(`https://wa.me/573173475482?text=${encodeURIComponent(msg)}`)
      this.value = ''
    }
    actualizarTotal()
  })

  // Envío citas
  document.getElementById('form-citas').addEventListener('submit', async function (e) {
    e.preventDefault()
    const telefono = document.getElementById('cita-telefono').value
    if (!telefono.startsWith('3') || telefono.length !== 10) {
      document.getElementById('error-telefono').innerHTML = '⚠️ Número inválido'
      document.getElementById('error-telefono').style.display = 'block'
      return
    }
    if (!fechaSeleccionada) { alert('Por favor selecciona un día.'); return }
    if (!horaSeleccionada) { alert('Por favor selecciona una hora disponible.'); return }
    if (!document.getElementById('terminos-check').checked) {
      alert('Debes aceptar los términos y condiciones.')
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

    // SAFARI FIX: abrir ventana ANTES del await (evento síncrono)
    // Safari bloquea window.open después de cualquier await
    const ventana = window.open('', '_blank')

    const resultado = await guardarCita(datos)
    if (resultado.exito) {
      const fechaFmt = new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      const adicionesTexto = adicionesSeleccionadas.length > 0
        ? `➕ Adiciones: ${adicionesSeleccionadas.join(', ')}\n` : ''
      const mensaje =
        `Hola Edwin ✂️, quiero confirmar mi cita.\n\n` +
        `👤 Nombre: ${datos.nombre}\n📱 Teléfono: ${datos.telefono}\n` +
        `✂️ Servicio: ${datos.servicio}\n${adicionesTexto}` +
        `📍 Ubicación: ${datos.ubicacion}\n📅 Fecha: ${fechaFmt}\n` +
        `🕐 Hora: ${datos.hora}\n💰 Total: $${total.toLocaleString()}\n\n` +
        `¿Queda confirmada la cita?`
      const urlWA = `https://wa.me/573173475482?text=${encodeURIComponent(mensaje)}`

      cerrarCitas()
      this.reset()
      document.getElementById('seccion-horas').style.display = 'none'
      document.getElementById('seccion-calendario').style.display = 'none'
      document.getElementById('boton-agendar').style.display = 'none'

      // Redirigir la ventana ya abierta a WhatsApp
      if (ventana) {
        ventana.location.href = urlWA
      } else {
        // Fallback si el popup fue bloqueado
        window.location.href = urlWA
      }
    } else {
      // Cerrar ventana vacía si hubo error
      if (ventana) ventana.close()
      alert('Hubo un error. Intenta de nuevo.')
    }
    boton.disabled = false
    actualizarTotal()
  })

  // Botón flotante — aparece solo cuando el hero sale de la vista
  const hero = document.getElementById('inicio')
  const btnFlotante = document.querySelector('.boton-flotante')

  const observadorHero = new IntersectionObserver((entradas) => {
    const heroVisible = entradas[0].isIntersecting
    btnFlotante.classList.toggle('visible', !heroVisible)
  }, { threshold: 0.1 })

  if (hero) observadorHero.observe(hero)

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

  // Escape cierra modales
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      cerrarModal(); cerrarCitas(); cerrarResena(); cerrarSesion()
    }
  })
})