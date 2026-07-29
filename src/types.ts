export type EstadoPendiente = 'ABIERTO' | 'EN_PROCESO' | 'PENDIENTE' | 'CERRADO';
export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA' | 'TRANSVERSAL';
export type Redundancia = 'UNICO' | 'DUPLICADO' | 'BITACORA';

export type UserRole = 'ADMIN' | 'LECTOR';

export interface EmailNotificationSettings {
  enabled: boolean;
  diasAnticipacion: number; // Días antes de la fecha estimada (e.g. 3, 5, 7, 15)
  prioridadFiltro: 'SOLO_ALTA' | 'TODAS'; // Por defecto prioridad ALTA
  soloMisPendientes: boolean; // Notificar si el usuario es responsable
  ultimoEnvioSimulado?: string;
}

export interface UserAccount {
  id: string;
  nombre: string;
  email: string;
  username: string;
  passwordHash: string; // Almacenado localmente para autenticación
  rol: UserRole;
  cargo?: string;
  dependencia?: string;
  fechaCreacion: string;
  ultimoAcceso?: string;
  notificacionesEmail?: EmailNotificationSettings;
}

export interface AdjuntoFile {
  id: string;
  nombre: string;
  tamano: number;
  tamanoFormateado: string;
  tipo: string;
  dataUrl: string;
  fechaSubida: string;
  autor?: string;
}

export interface PendienteItem {
  id: string;
  lineaCrea: string; // LINEA QUE CREA EL PENDIENTE (e.g. Gestión VA, Conocimiento e información)
  fuente: string; // FUENTE (e.g. PENDIENTES-ANDREA, BITACORA-ANDREA, CONOCIMIENTO-DUVAN)
  procesoSig: string; // LINEA MISIONAL (PROCESO) / PROCESO SIG
  lineaEjecutora: string; // PARA LINEA GESTIÓN/SUB PROCESOS / LINEA EJECUTORA
  topico: string; // TÓPICO
  tarea: string; // TAREA / ACCIÓN
  descripcionGeneral?: string; // DESCRIPCIÓN GENERAL DEL PENDIENTE
  estado: EstadoPendiente; // ABIERTO, EN_PROCESO, PENDIENTE, CERRADO
  redundancia: Redundancia; // UNICO, DUPLICADO
  responsable: string; // Reponsable Ejecución / PERSONAL Asistentes
  personalApoyo?: string; // PERSONAL Asistentes / apoyo
  acciones?: string; // ACCIONES / Detalle
  proyeccion?: string; // PROYECCIÓN / Resultado esperado
  entregable?: string; // Entregable
  insumo?: string; // INSUMO
  prioridad: Prioridad; // PRIORIZACIÓN
  temporalidad: string; // TEMPORALIDAD (TRIMESTRE)
  mesFinalizacion: string; // MES FINALIZACIÓN
  fechaEstimada: string; // FECHA ESTIMADA DE ENTREGA (YYYY-MM-DD)
  normaProcedimiento?: string; // Norma o procedimiento que lo solicita
  creadoPor?: string; // Quién lo generó/registró
  fechaCreacion: string; // ISO date
  ultimaActualizacion: string; // ISO date
  observaciones?: string;
  adjuntos?: AdjuntoFile[];
}

export interface FilterState {
  searchQuery: string;
  estado: string; // 'TODOS' | EstadoPendiente
  lineaCrea: string;
  responsable: string;
  procesoSig: string;
  topico: string;
  prioridad: string;
  temporalidad: string;
}

export interface NotificationItem {
  id: string;
  pendienteId: string;
  tareaTitle: string;
  responsable: string;
  lineaCrea: string;
  tipo: 'PENDIENTE_CRITICO' | 'ALTA_PRIORIDAD' | 'FECHA_CERCANA' | 'DUPLICADO' | 'RECORDATORIO_GENERAL';
  mensaje: string;
  fechaGen: string;
  leida: boolean;
  prioridad: Prioridad;
}

export interface ColumnMapping {
  lineaCrea?: string;
  fuente?: string;
  procesoSig?: string;
  lineaEjecutora?: string;
  topico?: string;
  tarea?: string;
  descripcionGeneral?: string;
  estado?: string;
  redundancia?: string;
  responsable?: string;
  personalApoyo?: string;
  acciones?: string;
  proyeccion?: string;
  entregable?: string;
  insumo?: string;
  prioridad?: string;
  temporalidad?: string;
  mesFinalizacion?: string;
  fechaEstimada?: string;
  normaProcedimiento?: string;
  observaciones?: string;
}

export interface AuditLog {
  id: string;
  pendienteId: string;
  usuario: string;
  campoModificado: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: string;
}
