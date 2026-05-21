import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
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
// INGRESOS ÚLTIMOS 7 DÍAS (para la gráfica)
// ================================================================
export async function obtenerIngresosUltimos7Dias() {
  try {
    const hoy = new Date()
    const dias = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() - i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dias.push(`${yyyy}-${mm}-${dd}`)
    }
    const snapshot = await getDocs(collection(db, "citas"))
    const mapa = {}
    dias.forEach(f => (mapa[f] = 0))
    snapshot.forEach(docSnap => {
      const data = docSnap.data()
      if (data.fecha && mapa[data.fecha] !== undefined && data.total) {
        mapa[data.fecha] += data.total
      }
    })
    return dias.map(fecha => ({
      fecha,
      etiqueta: new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' }),
      total: mapa[fecha]
    }))
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