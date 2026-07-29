import React, { useState, useEffect } from 'react';
import { X, Save, FilePlus, User, Calendar, Tag, AlertCircle } from 'lucide-react';
import { EstadoPendiente, PendienteItem, Prioridad, Redundancia } from '../types';
import { OPCIONES_LINEA_CREA, OPCIONES_PROCESO_SIG, OPCIONES_RESPONSABLE } from '../data/initialData';

interface PendienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PendienteItem) => void;
  initialItem?: PendienteItem | null;
}

export const PendienteFormModal: React.FC<PendienteFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem
}) => {
  const [formData, setFormData] = useState<Partial<PendienteItem>>({
    lineaCrea: OPCIONES_LINEA_CREA[0],
    fuente: 'PENDIENTES-ANDREA',
    procesoSig: OPCIONES_PROCESO_SIG[0],
    lineaEjecutora: 'Línea de Gestión',
    topico: 'NORMATIVA',
    tarea: '',
    descripcionGeneral: '',
    estado: 'PENDIENTE',
    redundancia: 'UNICO',
    responsable: OPCIONES_RESPONSABLE[0],
    personalApoyo: '',
    acciones: '',
    proyeccion: '',
    entregable: '',
    insumo: '',
    prioridad: 'ALTA',
    temporalidad: 'PRIMER TRIMESTRE',
    mesFinalizacion: 'MARZO',
    fechaEstimada: new Date().toISOString().split('T')[0],
    normaProcedimiento: 'Procedimiento SIG UPTC',
    creadoPor: 'Usuario Administrador',
    observaciones: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialItem) {
      setFormData({ 
        ...initialItem,
        descripcionGeneral: initialItem.descripcionGeneral || initialItem.acciones || ''
      });
    } else {
      setFormData({
        lineaCrea: OPCIONES_LINEA_CREA[0],
        fuente: 'PENDIENTES-ANDREA',
        procesoSig: OPCIONES_PROCESO_SIG[0],
        lineaEjecutora: 'Línea de Gestión',
        topico: 'NORMATIVA',
        tarea: '',
        descripcionGeneral: '',
        estado: 'PENDIENTE',
        redundancia: 'UNICO',
        responsable: OPCIONES_RESPONSABLE[0],
        personalApoyo: '',
        acciones: '',
        proyeccion: '',
        entregable: '',
        insumo: '',
        prioridad: 'ALTA',
        temporalidad: 'PRIMER TRIMESTRE',
        mesFinalizacion: 'MARZO',
        fechaEstimada: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        normaProcedimiento: 'Procedimiento SIG UPTC',
        creadoPor: 'Usuario Administrador',
        observaciones: ''
      });
    }
    setErrors({});
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof PendienteItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { [key: string]: string } = {};

    if (!formData.tarea?.trim()) {
      errs.tarea = 'La descripción de la tarea o pendiente es obligatoria.';
    }
    if (!formData.responsable?.trim()) {
      errs.responsable = 'Debe asignar un responsable de ejecución.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const now = new Date().toISOString();
    const finalItem: PendienteItem = {
      id: formData.id || `UPTC-${Date.now().toString(36).toUpperCase()}`,
      lineaCrea: formData.lineaCrea || 'Gestión VA',
      fuente: formData.fuente || 'PENDIENTES-ANDREA',
      procesoSig: formData.procesoSig || 'GESTIÓN VA',
      lineaEjecutora: formData.lineaEjecutora || 'Línea Ejecutora',
      topico: formData.topico || 'GENERAL',
      tarea: formData.tarea!.trim(),
      descripcionGeneral: formData.descripcionGeneral || '',
      estado: (formData.estado as EstadoPendiente) || 'PENDIENTE',
      redundancia: (formData.redundancia as Redundancia) || 'UNICO',
      responsable: formData.responsable!.trim(),
      personalApoyo: formData.personalApoyo || '',
      acciones: formData.acciones || '',
      proyeccion: formData.proyeccion || '',
      entregable: formData.entregable || '',
      insumo: formData.insumo || '',
      prioridad: (formData.prioridad as Prioridad) || 'MEDIA',
      temporalidad: formData.temporalidad || 'PRIMER TRIMESTRE',
      mesFinalizacion: formData.mesFinalizacion || 'ENERO',
      fechaEstimada: formData.fechaEstimada || new Date().toISOString().split('T')[0],
      normaProcedimiento: formData.normaProcedimiento || 'Reglamento UPTC',
      creadoPor: formData.creadoPor || 'Sistema UPTC',
      fechaCreacion: formData.fechaCreacion || now,
      ultimaActualizacion: now,
      observaciones: formData.observaciones || ''
    };

    onSave(finalItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-400/30">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {initialItem ? 'Editar Pendiente UPTC' : 'Registrar Nuevo Pendiente'}
              </h3>
              <p className="text-xs text-slate-300">
                Llene los campos para actualizar la matriz de seguimiento institucional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Tarea / Asunto principal */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Nombre de la Tarea / Asunto Principal <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-tarea"
              type="text"
              value={formData.tarea || ''}
              onChange={(e) => handleChange('tarea', e.target.value)}
              placeholder="Ej: Modificación del acuerdo 061 de 2022 para procesos de aseguramiento..."
              className={`w-full p-2.5 rounded-lg border text-xs focus:ring-2 focus:ring-amber-500 outline-none font-semibold ${
                errors.tarea ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300'
              }`}
            />
            {errors.tarea && <p className="text-[11px] text-rose-600 mt-1 font-semibold">{errors.tarea}</p>}
          </div>

          {/* Descripción General del Pendiente */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Descripción General del Pendiente (Detalle completo)</span>
              <span className="text-[10px] text-slate-400 font-normal">Información extendida, alcance y antecedentes</span>
            </label>
            <textarea
              id="input-descripcion-general"
              rows={3}
              value={formData.descripcionGeneral || ''}
              onChange={(e) => handleChange('descripcionGeneral', e.target.value)}
              placeholder="Describa de manera detallada el alcance, contexto, objetivo y desarrollo general de este pendiente UPTC..."
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Grid Layout 1: Creador & Proceso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                LÍNEA QUE CREA EL PENDIENTE
              </label>
              <input
                id="input-linea-crea"
                list="lineas-crea-list"
                value={formData.lineaCrea || ''}
                onChange={(e) => handleChange('lineaCrea', e.target.value)}
                placeholder="Seleccione o escriba la línea creadora"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <datalist id="lineas-crea-list">
                {OPCIONES_LINEA_CREA.map((linea) => (
                  <option key={linea} value={linea} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                PROCESO SIG / LÍNEA MISIONAL
              </label>
              <input
                id="input-proceso-sig"
                list="procesos-sig-list"
                value={formData.procesoSig || ''}
                onChange={(e) => handleChange('procesoSig', e.target.value)}
                placeholder="Ej: ASEGURAMIENTO DE LA CALIDAD"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <datalist id="procesos-sig-list">
                {OPCIONES_PROCESO_SIG.map((proc) => (
                  <option key={proc} value={proc} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Grid Layout 2: Responsable y Personal Apoyo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Responsable de Ejecución <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-responsable"
                list="responsables-list"
                value={formData.responsable || ''}
                onChange={(e) => handleChange('responsable', e.target.value)}
                placeholder="Ej: Ismael, Camilo, Andrea..."
                className={`w-full p-2 bg-white border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none ${
                  errors.responsable ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300'
                }`}
              />
              <datalist id="responsables-list">
                {OPCIONES_RESPONSABLE.map((resp) => (
                  <option key={resp} value={resp} />
                ))}
              </datalist>
              {errors.responsable && <p className="text-[11px] text-rose-600 mt-1 font-semibold">{errors.responsable}</p>}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Personal Asistentes / Apoyo
              </label>
              <input
                id="input-personal-apoyo"
                type="text"
                value={formData.personalApoyo || ''}
                onChange={(e) => handleChange('personalApoyo', e.target.value)}
                placeholder="Ej: Andrea Pérez / Pedro / Laura"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Grid Layout 3: Estado, Prioridad, Redundancia, Tópico */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ESTADO</label>
              <select
                id="select-estado"
                value={formData.estado || 'PENDIENTE'}
                onChange={(e) => handleChange('estado', e.target.value as EstadoPendiente)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
              >
                <option value="ABIERTO">ABIERTO</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="CERRADO">CERRADO</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">PRIORIZACIÓN</label>
              <select
                id="select-prioridad"
                value={formData.prioridad || 'ALTA'}
                onChange={(e) => handleChange('prioridad', e.target.value as Prioridad)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
              >
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAJA">BAJA</option>
                <option value="TRANSVERSAL">TRANSVERSAL</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">REDUNDANCIA</label>
              <select
                id="select-redundancia"
                value={formData.redundancia || 'UNICO'}
                onChange={(e) => handleChange('redundancia', e.target.value as Redundancia)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
              >
                <option value="UNICO">ÚNICO</option>
                <option value="DUPLICADO">DUPLICADO</option>
                <option value="BITACORA">BITÁCORA</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">TÓPICO</label>
              <input
                id="input-topico"
                type="text"
                value={formData.topico || ''}
                onChange={(e) => handleChange('topico', e.target.value)}
                placeholder="Ej: NORMATIVA"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Grid Layout 4: Fechas y Trimestres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">TEMPORALIDAD (TRIMESTRE)</label>
              <select
                id="select-temporalidad"
                value={formData.temporalidad || 'PRIMER TRIMESTRE'}
                onChange={(e) => handleChange('temporalidad', e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="PRIMER TRIMESTRE">PRIMER TRIMESTRE</option>
                <option value="SEGUNDO TRIMESTRE">SEGUNDO TRIMESTRE</option>
                <option value="TERCER TRIMESTRE">TERCER TRIMESTRE</option>
                <option value="CUARTO TRIMESTRE">CUARTO TRIMESTRE</option>
                <option value="TRANSVERSAL">TRANSVERSAL</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">MES FINALIZACIÓN</label>
              <input
                id="input-mes-finalizacion"
                type="text"
                value={formData.mesFinalizacion || ''}
                onChange={(e) => handleChange('mesFinalizacion', e.target.value)}
                placeholder="Ej: ENERO, FEBRERO..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">FECHA ESTIMADA ENTREGA</label>
              <input
                id="input-fecha-estimada"
                type="date"
                value={formData.fechaEstimada || ''}
                onChange={(e) => handleChange('fechaEstimada', e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Detail fields: Entregables & Acciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Entregable Esperado</label>
              <input
                id="input-entregable"
                type="text"
                value={formData.entregable || ''}
                onChange={(e) => handleChange('entregable', e.target.value)}
                placeholder="Ej: Proyecto de Acuerdo, Informe Técnico, Matriz..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Norma o Procedimiento que lo solicita</label>
              <input
                id="input-norma"
                type="text"
                value={formData.normaProcedimiento || ''}
                onChange={(e) => handleChange('normaProcedimiento', e.target.value)}
                placeholder="Ej: Acuerdo 061 de 2022 / Circular 016"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-800">
                Observaciones / Historial de lo Realizado
              </label>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const stamp = `\n📌 [${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]: `;
                  handleChange('observaciones', (formData.observaciones || '') + stamp);
                }}
                className="text-[10px] font-bold text-[#006b3f] hover:text-[#005432] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>+ Insertar Fecha Actual</span>
              </button>
            </div>
            <textarea
              id="input-observaciones"
              rows={3}
              value={formData.observaciones || ''}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Registre las observaciones, novedades, trámites adelantados o bitácora de lo que se ha realizado con este pendiente..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              id="btn-guardar-pendiente"
              type="submit"
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-lg font-bold shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialItem ? 'Guardar Cambios' : 'Registrar Pendiente'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
