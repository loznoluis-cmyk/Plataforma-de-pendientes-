import { UserAccount } from '../types';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-ADMIN-01',
    nombre: 'Administrador UPTC',
    email: 'admin@uptc.edu.co',
    username: 'admin',
    passwordHash: 'admin123',
    rol: 'ADMIN',
    cargo: 'Coordinador SIG - Vicerrectoría Académica',
    dependencia: 'Vicerrectoría Académica UPTC',
    fechaCreacion: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
    notificacionesEmail: {
      enabled: true,
      diasAnticipacion: 7,
      prioridadFiltro: 'SOLO_ALTA',
      soloMisPendientes: false
    }
  },
  {
    id: 'USR-LECTOR-01',
    nombre: 'Consultor Institucional',
    email: 'consultor@uptc.edu.co',
    username: 'consultor',
    passwordHash: '123456',
    rol: 'LECTOR',
    cargo: 'Auditor de Consulta / Docente',
    dependencia: 'Facultad de Educación UPTC',
    fechaCreacion: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
    notificacionesEmail: {
      enabled: false,
      diasAnticipacion: 5,
      prioridadFiltro: 'SOLO_ALTA',
      soloMisPendientes: false
    }
  }
];
