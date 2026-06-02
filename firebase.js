import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyD4yAsvddRGNbBKKm32azPwY-Rm23px8_U",
  authDomain: "edwin-barber.firebaseapp.com",
  projectId: "edwin-barber",
  storageBucket: "edwin-barber.firebasestorage.app",
  messagingSenderId: "827479406295",
  appId: "1:827479406295:web:ce192a81bad4ac644fe292"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ================================================================
// CONFIGURACIÓN DE SLOTS (modular — fácil de hacer editable luego)
// ================================================================
export const CONFIG_SLOTS = {
  sabado: {
    nombre: 'Sábado',
    turnos: [
      '2:00 PM','2:40 PM','3:20 PM','4:00 PM','4:40 PM',
      '5:20 PM','6:00 PM','6:40 PM','7:20 PM','8:00 PM'
    ]
  },
  domingo: {
    nombre: 'Domingo',
    turnos: [
      '9:00 AM','9:40 AM','10:20 AM','11:00 AM','11:40 AM',
      '12:20 PM','1:00 PM','1:40 PM','2:20 PM'
    ]
  }
}

// ================================================================
// ADMIN — verificación de contraseña (sin servidor, hash simple)
// Para producción futura: migrar a Firebase Auth
// ================================================================
const ADMIN_PASS_HASH = btoa('edwin2025') // base64 simple, fácil de cambiar

export function verificarAdmin(password) {
  return btoa(password) === ADMIN_PASS_HASH
}

// Sesión admin en sessionStorage (se borra al cerrar el navegador)
export function sesionAdminActiva() {
  return sessionStorage.getItem('eb_admin') === ADMIN_PASS_HASH
}

export function iniciarSesionAdmin(password) {
  if (verificarAdmin(password)) {
    sessionStorage.setItem('eb_admin', ADMIN_PASS_HASH)
    return true
  }
  return false
}

export function cerrarSesionAdmin() {
  sessionStorage.removeItem('eb_admin')
}

// ================================================================
// GUARDAR CITA (guarda total para ingresos)
// ================================================================
export async function guardarCita(datos) {
  try {
    const docRef = await addDoc(collection(db, "citas"), {
      ...datos,
      estado: "pendiente",
      timestamp: serverTimestamp()
    })
    return { exito: true, id: docRef.id }
  } catch (error) {
    return { exito: false, error: error.message }
  }
}

// ================================================================
// HORAS OCUPADAS POR FECHA
// ================================================================
export async function obtenerHorasOcupadas(fecha) {
  try {
    const q = query(collection(db, "citas"), where("fecha", "==", fecha))
    const snapshot = await getDocs(q)
    const horas = []
    snapshot.forEach(doc => horas.push(doc.data().hora))
    return horas
  } catch (error) {
    return []
  }
}

// ================================================================
// CITAS POR TELÉFONO (para el cliente)
// ================================================================
export async function obtenerCitasPorTelefono(telefono) {
  try {
    const q = query(
      collection(db, "citas"),
      where("telefono", "==", telefono)
    )
    const snapshot = await getDocs(q)
    const citas = []
    snapshot.forEach(doc => citas.push({ id: doc.id, ...doc.data() }))
    // Ordenar por fecha descendente en cliente
    citas.sort((a, b) => {
      if (!a.fecha || !b.fecha) return 0
      return b.fecha.localeCompare(a.fecha)
    })
    return citas
  } catch (error) {
    return []
  }
}

// ================================================================
// TODAS LAS CITAS (solo admin)
// ================================================================
export async function obtenerTodasLasCitas() {
  try {
    const snapshot = await getDocs(collection(db, "citas"))
    const citas = []
    snapshot.forEach(doc => citas.push({ id: doc.id, ...doc.data() }))
    citas.sort((a, b) => {
      if (!a.fecha || !b.fecha) return 0
      const fechaComp = b.fecha.localeCompare(a.fecha)
      if (fechaComp !== 0) return fechaComp
      return (a.hora || '').localeCompare(b.hora || '')
    })
    return citas
  } catch (error) {
    return []
  }
}

// ================================================================
// CITAS POR FECHA (para el panel de agenda)
// ================================================================
export async function obtenerCitasPorFecha(fecha) {
  try {
    const q = query(collection(db, "citas"), where("fecha", "==", fecha))
    const snapshot = await getDocs(q)
    const citas = []
    snapshot.forEach(doc => citas.push({ id: doc.id, ...doc.data() }))
    citas.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
    return citas
  } catch (error) {
    return []
  }
}

// ================================================================
// INGRESOS POR SEMANA (lunes a domingo) — para la gráfica navegable
// offset: 0 = semana actual, -1 = semana pasada, etc.
// ================================================================
export async function obtenerIngresosSemana(offset = 0) {
  try {
    const hoy = new Date()
    const diaSemana = hoy.getDay() // 0=dom, 1=lun...
    const lunesOffset = diaSemana === 0 ? -6 : 1 - diaSemana
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() + lunesOffset + offset * 7)

    const dias = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes)
      d.setDate(lunes.getDate() + i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dias.push({
        fecha: `${yyyy}-${mm}-${dd}`,
        etiqueta: d.toLocaleDateString('es', { weekday: 'short' }),
        dia: d.getDate(),
        total: 0
      })
    }

    const snapshot = await getDocs(collection(db, "citas"))
    snapshot.forEach(docSnap => {
      const data = docSnap.data()
      const entrada = dias.find(d => d.fecha === data.fecha)
      if (entrada && data.total) entrada.total += data.total
    })

    // Etiqueta del rango para mostrar en la UI
    const inicio = dias[0]
    const fin = dias[6]
    const rangoTexto = `${inicio.dia} – ${fin.dia} ${new Date(fin.fecha + 'T12:00:00').toLocaleDateString('es', { month: 'short' })}`

    return { dias, rangoTexto }
  } catch (error) {
    return { dias: [], rangoTexto: '' }
  }
}

// ================================================================
// CITAS POR RANGO DE FECHAS (para exportar Excel)
// ================================================================
export async function obtenerCitasPorRango(fechaInicio, fechaFin) {
  try {
    const snapshot = await getDocs(collection(db, "citas"))
    const citas = []
    snapshot.forEach(docSnap => {
      const data = docSnap.data()
      if (data.fecha && data.fecha >= fechaInicio && data.fecha <= fechaFin) {
        citas.push({ id: docSnap.id, ...data })
      }
    })
    citas.sort((a, b) => {
      const fechaComp = a.fecha.localeCompare(b.fecha)
      if (fechaComp !== 0) return fechaComp
      return (a.hora || '').localeCompare(b.hora || '')
    })
    return citas
  } catch (error) {
    return []
  }
}

// ================================================================
// STATS DEL DÍA (ocupación + citas + ingresos del día)
// ================================================================
export async function obtenerStatsDia(fecha) {
  try {
    const diaSemana = new Date(fecha + 'T12:00:00').getDay()
    const slotsDia = diaSemana === 6
      ? CONFIG_SLOTS.sabado.turnos.length
      : diaSemana === 0
        ? CONFIG_SLOTS.domingo.turnos.length
        : 0

    const citas = await obtenerCitasPorFecha(fecha)
    const totalCitas = citas.length
    const ingresosDia = citas.reduce((sum, c) => sum + (c.total || 0), 0)
    const ocupacion = slotsDia > 0 ? Math.round((totalCitas / slotsDia) * 100) : 0

    return {
      totalCitas,
      slotsDia,
      ocupacion,
      ingresosDia,
      citas
    }
  } catch (error) {
    return null
  }
}

// ================================================================
// ACTUALIZAR ESTADO DE CITA (pendiente / confirmada / completada / cancelada)
// ================================================================
export async function actualizarEstadoCita(id, nuevoEstado) {
  try {
    await updateDoc(doc(db, "citas", id), { estado: nuevoEstado })
    return { exito: true }
  } catch (error) {
    return { exito: false, error: error.message }
  }
}

// ================================================================
// CANCELAR CITA DESDE CLIENTE
// Verifica que falte más de 1 hora antes de cancelar
// ================================================================
export async function cancelarCitaCliente(id) {
  try {
    const docSnap = await getDoc(doc(db, "citas", id))
    if (!docSnap.exists()) return { exito: false, error: 'Cita no encontrada' }

    const cita = docSnap.data()

    // Verificar tiempo límite — debe faltar más de 1 hora
    if (cita.fecha && cita.hora) {
      const [horaStr, periodo] = cita.hora.split(' ')
      let [h, m] = horaStr.split(':').map(Number)
      if (periodo === 'PM' && h !== 12) h += 12
      if (periodo === 'AM' && h === 12) h = 0

      const fechaCita = new Date(cita.fecha + 'T00:00:00')
      fechaCita.setHours(h, m, 0, 0)

      const ahora = new Date()
      const difMinutos = (fechaCita - ahora) / 60000

      if (difMinutos < 60) {
        return {
          exito: false,
          tiempoAgotado: true,
          error: 'No puedes cancelar con menos de 1 hora de anticipación'
        }
      }
    }

    await updateDoc(doc(db, "citas", id), { estado: 'cancelada' })
    return { exito: true, cita }
  } catch (error) {
    return { exito: false, error: error.message }
  }
}

// ================================================================
// GUARDAR RESEÑA
// ================================================================
export async function guardarResena(datos) {
  try {
    const docRef = await addDoc(collection(db, "resenas"), {
      ...datos,
      timestamp: serverTimestamp()
    })
    return { exito: true, id: docRef.id }
  } catch (error) {
    return { exito: false, error: error.message }
  }
}

// ================================================================
// OBTENER RESEÑAS APROBADAS
// ================================================================
export async function obtenerResenas() {
  try {
    const q = query(
      collection(db, "resenas"),
      where("aprobada", "==", true)
    )
    const snapshot = await getDocs(q)
    const resenas = []
    snapshot.forEach(doc => resenas.push({ id: doc.id, ...doc.data() }))
    return resenas
  } catch (error) {
    return []
  }
}

// ================================================================
// CONFIGURACIÓN DE HORARIOS
// ================================================================
export async function obtenerConfigHorariosDB() {
  try {
    const docSnap = await getDoc(doc(db, 'config', 'horarios'))
    return docSnap.exists() ? docSnap.data() : null
  } catch (error) {
    return null
  }
}

export async function guardarConfigHorariosDB(config) {
  try {
    // Serializar arrays a strings para compatibilidad con Firestore
    const configSerializada = {}
    Object.entries(config).forEach(([dia, datos]) => {
      configSerializada[dia] = {
        activo: datos.activo,
        nombre: datos.nombre,
        horas: Array.isArray(datos.horas) ? datos.horas : []
      }
    })
    await setDoc(doc(db, 'config', 'horarios'), configSerializada)
    return true
  } catch (error) {
    console.error('Error guardando config:', error)
    return false
  }
}

// ================================================================
// BLOQUEO DE FECHAS
// ================================================================
export async function bloquearFecha(fecha, motivo = '') {
  try {
    await setDoc(doc(db, "fechas_bloqueadas", fecha), {
      fecha,
      motivo,
      timestamp: serverTimestamp()
    })
    return { exito: true }
  } catch (error) {
    return { exito: false, error: error.message }
  }
}

export async function desbloquearFecha(fecha) {
  try {
    await deleteDoc(doc(db, "fechas_bloqueadas", fecha))
    return { exito: true }
  } catch (error) {
    return { exito: false, error: error.message }
  }
}

export async function estaFechaBloqueada(fecha) {
  try {
    const docSnap = await getDoc(doc(db, "fechas_bloqueadas", fecha))
    return docSnap.exists()
  } catch (error) {
    return false
  }
}

export async function obtenerFechasBloqueadas() {
  try {
    const snapshot = await getDocs(collection(db, "fechas_bloqueadas"))
    const fechas = []
    snapshot.forEach(d => fechas.push(d.data().fecha))
    return fechas
  } catch (error) {
    return []
  }
}