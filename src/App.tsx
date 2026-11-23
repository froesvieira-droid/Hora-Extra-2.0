/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Clock, Eye, EyeOff, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface WorkDay {
  id: string;
  hours75: number | '';
  hours162: number | '';
  hours100: number | '';
  hours200: number | '';
}

interface HistoryEntry {
  id: string;
  period: string;
  totalOvertimeWithDsr: number;
  dateSaved: string;
}

const GTA6_BG_IMAGE = '/assets/aistudio/file_000000002650820e8954e71b2ede2419_99aeb62e.png';

export default function App() {
  // Inputs
  const [hourlyWage, setHourlyWage] = useState<number | ''>('');
  const [workload, setWorkload] = useState<number>(220);

  // Days worked
  const [days, setDays] = useState<WorkDay[]>([
    { id: '1', hours75: '', hours162: '', hours100: '', hours200: '' },
  ]);
  const [expandedDayId, setExpandedDayId] = useState<string | null>('1');
  const [isCalculationVisible, setIsCalculationVisible] = useState(true);

  // Background contrast mode
  const [highlightBackdrop, setHighlightBackdrop] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('overtime-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [referenceMonth, setReferenceMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [entryTime, setEntryTime] = useState<string>('');
  const [exitTime, setExitTime] = useState<string>('');

  // Time calculator
  const workedHoursResult = useMemo(() => {
    if (!entryTime || !exitTime) return null;

    const formatDuration = (min: number) => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${h}h ${m.toString().padStart(2, '0')}min`;
    };

    const [h1, m1] = entryTime.split(':').map(Number);
    const [h2, m2] = exitTime.split(':').map(Number);
    const mEntry = h1 * 60 + m1;
    let mExit = h2 * 60 + m2;

    if (mExit < mEntry) mExit += 1440;

    const limit22h = 22 * 60;
    const limit00h = 24 * 60;

    const p1Min = Math.max(0, Math.min(mExit, limit22h) - mEntry);
    const p2Min = Math.max(0, Math.min(mExit, limit00h) - Math.max(mEntry, limit22h));
    const p3Min = Math.max(0, mExit - Math.max(mEntry, limit00h));

    const totalMinutes = mExit - mEntry;

    return {
      total: formatDuration(totalMinutes),
      p1: formatDuration(p1Min),
      p2: formatDuration(p2Min),
      p3: formatDuration(p3Min),
      decimal: (totalMinutes / 60).toFixed(2),
    };
  }, [entryTime, exitTime]);

  // Overtime calculations
  const calculations = useMemo(() => {
    const wage = Number(hourlyWage || 0);

    const totals = days.reduce(
      (acc, day) => {
        acc.val75 += wage * 1.75 * Number(day.hours75 || 0);
        acc.val162 += wage * 2.625 * Number(day.hours162 || 0);
        acc.val100 += wage * 2.0 * Number(day.hours100 || 0);
        acc.val200 += wage * 3.0 * Number(day.hours200 || 0);
        return acc;
      },
      { val75: 0, val162: 0, val100: 0, val200: 0 }
    );

    const totalOvertime = totals.val75 + totals.val162 + totals.val100 + totals.val200;
    const dsr = totalOvertime * 0.2;
    const totalOvertimeWithDsr = totalOvertime + dsr;

    const baseSalary = wage * workload;
    const grandTotal = baseSalary + totalOvertimeWithDsr;

    return {
      ...totals,
      totalOvertime,
      dsr,
      totalOvertimeWithDsr,
      baseSalary,
      grandTotal,
    };
  }, [hourlyWage, workload, days]);

  const addDay = () => {
    const newId = Date.now().toString();
    setDays([...days, { id: newId, hours75: '', hours162: '', hours100: '', hours200: '' }]);
    setExpandedDayId(newId);
  };

  const removeDay = (id: string) => {
    if (days.length > 1) {
      const remaining = days.filter((d) => d.id !== id);
      setDays(remaining);
      if (expandedDayId === id) setExpandedDayId(remaining[0].id);
    }
  };

  const updateDay = (id: string, field: keyof WorkDay, value: number | '') => {
    setDays(days.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const resetAll = () => {
    setHourlyWage('');
    setWorkload(220);
    setEntryTime('');
    setExitTime('');
    setDays([{ id: '1', hours75: '', hours162: '', hours100: '', hours200: '' }]);
    setExpandedDayId('1');
  };

  const saveToHistory = () => {
    const [year, month] = referenceMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 16);
    const endDate = new Date(year, month, 15);

    const period = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;

    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      period,
      totalOvertimeWithDsr: calculations.totalOvertimeWithDsr,
      dateSaved: new Date().toISOString(),
    };
    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);
    localStorage.setItem('overtime-history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryEntry = (id: string) => {
    const updatedHistory = history.filter((entry) => entry.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('overtime-history', JSON.stringify(updatedHistory));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-100 overflow-x-hidden">
      {/* GTA 6 Vice City Background Layer */}
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-[#090611] via-[#220a2c] to-[#2e120f]" aria-hidden="true">
        <img
          src={GTA6_BG_IMAGE}
          alt="Tema de fundo inspirado em Vice City ao pôr do sol"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-[center_20%] transition-transform duration-700"
        />
      </div>

      {/* Measured Atmospheric Scrim for WCAG AA Legibility */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 -z-10 transition-opacity duration-300 ${
          highlightBackdrop
            ? 'bg-gradient-to-br from-[#090611]/45 via-[#130820]/35 to-[#1f0a17]/45'
            : 'bg-gradient-to-br from-[#090611]/78 via-[#140922]/68 to-[#210b19]/75'
        }`}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.14),transparent_55%)] pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/15">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-fuchsia-600 shadow-lg shadow-pink-950/50">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white [text-wrap:balance] drop-shadow-sm">
              Simulação do cálculo de Horas Extras
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setHighlightBackdrop(!highlightBackdrop)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#120b1f]/80 hover:bg-[#1d1230] text-slate-200 border border-white/15 backdrop-blur-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            >
              {highlightBackdrop ? <EyeOff className="w-4 h-4 text-amber-300" /> : <Eye className="w-4 h-4 text-pink-400" />}
              <span>{highlightBackdrop ? 'Escurecer fundo' : 'Destacar fundo'}</span>
            </button>

            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#120b1f]/80 hover:bg-rose-950/70 text-rose-200 border border-rose-400/25 backdrop-blur-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar tudo</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Informações */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-6 bg-[#0d0818]/84 backdrop-blur-xl rounded-2xl border border-white/12 p-6 md:p-8 shadow-2xl shadow-black/60 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="font-display text-xl font-bold text-amber-300 tracking-tight">
                Informações
              </h2>
              <span className="text-xs text-slate-400 tabular-nums">
                {days.length} {days.length === 1 ? 'dia registrado' : 'dias registrados'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label htmlFor="hourly-wage" className="block text-sm font-medium text-slate-200">
                  Salário hora (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-300/80 text-sm font-mono font-medium">
                    R$
                  </span>
                  <input
                    id="hourly-wage"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={hourlyWage}
                    onChange={(e) => setHourlyWage(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-11 pr-4 py-2.5 bg-[#171029]/90 border border-white/15 rounded-lg text-white placeholder:text-slate-500 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="workload-select" className="block text-sm font-medium text-slate-200">
                  Carga horária
                </label>
                <div className="relative">
                  <select
                    id="workload-select"
                    value={workload}
                    onChange={(e) => setWorkload(Number(e.target.value))}
                    className="w-full px-4 py-2.5 pr-9 bg-[#171029]/90 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value={220}>Primeiro e segundo turno — 220 horas</option>
                    <option value={180}>Turno Especial — 180 horas</option>
                    <option value={150}>Meio Período — 150 horas</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h3 className="font-display text-base font-bold text-white">Dias trabalhados</h3>
                <div className="flex items-center gap-2.5">
                  <input
                    aria-label="Mês de referência"
                    type="month"
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    className="text-xs font-mono tabular-nums bg-[#171029]/90 text-slate-200 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/70"
                  />
                  <button
                    type="button"
                    onClick={addDay}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-pink-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 px-3.5 py-2 rounded-lg shadow-md shadow-pink-950/40 transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar dia</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-white/10 border border-white/10 rounded-xl bg-[#130c22]/65 overflow-hidden">
                {days.map((day, index) => {
                  const dayTotal =
                    Number(day.hours75 || 0) * (Number(hourlyWage || 0) * 1.75) +
                    Number(day.hours162 || 0) * (Number(hourlyWage || 0) * 2.625) +
                    Number(day.hours100 || 0) * (Number(hourlyWage || 0) * 2.0) +
                    Number(day.hours200 || 0) * (Number(hourlyWage || 0) * 3.0);
                  const isExpanded = expandedDayId === day.id;

                  return (
                    <div key={day.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedDayId(isExpanded ? null : day.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedDayId(isExpanded ? null : day.id);
                          }
                        }}
                        className="flex justify-between items-center px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-400"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold tracking-wide text-amber-300">
                            Dia {index + 1}
                          </span>
                          <span aria-hidden="true" className="text-white/25">
                            ·
                          </span>
                          <span className="text-sm font-mono font-semibold tabular-nums text-pink-300">
                            {formatCurrency(dayTotal)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {days.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDay(day.id);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 hover:text-rose-200 px-2 py-1 rounded hover:bg-rose-500/15 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-white/10 bg-[#0c0816]/45">
                              <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-300">
                                  75% (5h–22h)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  value={day.hours75}
                                  onChange={(e) =>
                                    updateDay(day.id, 'hours75', e.target.value === '' ? '' : Number(e.target.value))
                                  }
                                  className="w-full px-3 py-2 bg-[#1a1230] border border-white/15 rounded-lg text-sm font-mono tabular-nums text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-300">
                                  162,5% (22h–5h)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  value={day.hours162}
                                  onChange={(e) =>
                                    updateDay(day.id, 'hours162', e.target.value === '' ? '' : Number(e.target.value))
                                  }
                                  className="w-full px-3 py-2 bg-[#1a1230] border border-white/15 rounded-lg text-sm font-mono tabular-nums text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-300">
                                  100% (Dom 5h–22h)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  value={day.hours100}
                                  onChange={(e) =>
                                    updateDay(day.id, 'hours100', e.target.value === '' ? '' : Number(e.target.value))
                                  }
                                  className="w-full px-3 py-2 bg-[#1a1230] border border-white/15 rounded-lg text-sm font-mono tabular-nums text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-300">
                                  200% (Dom 22h–5h)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  value={day.hours200}
                                  onChange={(e) =>
                                    updateDay(day.id, 'hours200', e.target.value === '' ? '' : Number(e.target.value))
                                  }
                                  className="w-full px-3 py-2 bg-[#1a1230] border border-white/15 rounded-lg text-sm font-mono tabular-nums text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* Right Column: Cálculo */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="lg:col-span-6 bg-[#0d0818]/86 backdrop-blur-xl rounded-2xl border border-white/12 p-6 md:p-8 shadow-2xl shadow-black/60"
          >
            <button
              type="button"
              onClick={() => setIsCalculationVisible(!isCalculationVisible)}
              className="w-full flex items-center justify-between pb-4 mb-6 border-b border-white/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded cursor-pointer"
            >
              <span className="font-display text-xl font-bold text-pink-300 tracking-tight">
                Cálculo
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <span>{isCalculationVisible ? 'Ocultar' : 'Expandir'}</span>
                {isCalculationVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence>
              {isCalculationVisible && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-7">
                    {/* Calculadora de Tempo */}
                    <div className="pb-6 border-b border-white/10 space-y-4">
                      <h3 className="text-xs font-semibold text-amber-300 tracking-wide flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Calculadora de Tempo</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label htmlFor="entry-time" className="block text-xs font-medium text-slate-300">
                            Entrada
                          </label>
                          <input
                            id="entry-time"
                            type="time"
                            value={entryTime}
                            onChange={(e) => setEntryTime(e.target.value)}
                            className="w-full px-3 py-2 bg-[#171029]/90 border border-white/15 rounded-lg text-sm font-mono tabular-nums text-white outline-none focus:ring-2 focus:ring-amber-400/70"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="exit-time" className="block text-xs font-medium text-slate-300">
                            Saída
                          </label>
                          <input
                            id="exit-time"
                            type="time"
                            value={exitTime}
                            onChange={(e) => setExitTime(e.target.value)}
                            className="w-full px-3 py-2 bg-[#171029]/90 border border-white/15 rounded-lg text-sm font-mono tabular-nums text-white outline-none focus:ring-2 focus:ring-amber-400/70"
                          />
                        </div>
                      </div>

                      {workedHoursResult && (
                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="flex justify-between items-center text-xs text-slate-300">
                            <span>1º Período (até 22:00)</span>
                            <span className="font-mono tabular-nums text-slate-100">{workedHoursResult.p1}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-300">
                            <span>2º Período (22:00 às 00:00)</span>
                            <span className="font-mono tabular-nums text-slate-100">{workedHoursResult.p2}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-300">
                            <span>3º Período (00:00 até saída)</span>
                            <span className="font-mono tabular-nums text-slate-100">{workedHoursResult.p3}</span>
                          </div>
                          <div className="pt-2.5 mt-2 border-t border-white/10 flex justify-between items-center">
                            <span className="text-xs font-semibold text-amber-200">Tempo Total</span>
                            <div className="text-right">
                              <p className="text-sm font-bold font-mono tabular-nums text-amber-300">
                                {workedHoursResult.total}
                              </p>
                              <p className="text-xs text-slate-400 font-mono tabular-nums">
                                ({workedHoursResult.decimal}h decimais)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detalhamento por Percentual */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3.5">
                        <h3 className="text-xs font-semibold text-slate-400 tracking-wide">
                          De segunda a sábado
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-slate-300 mb-0.5">Valor das Horas Extras 75,00%</p>
                            <p className="text-lg font-mono font-semibold tabular-nums text-white">
                              {formatCurrency(calculations.val75)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-300 mb-0.5">Valor das Horas Extras 162,50%</p>
                            <p className="text-lg font-mono font-semibold tabular-nums text-white">
                              {formatCurrency(calculations.val162)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <h3 className="text-xs font-semibold text-slate-400 tracking-wide">
                          Domingo e Feriados
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-slate-300 mb-0.5">Valor das Horas Extras 100,00%</p>
                            <p className="text-lg font-mono font-semibold tabular-nums text-white">
                              {formatCurrency(calculations.val100)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-300 mb-0.5">Valor das Horas Extras 200,00%</p>
                            <p className="text-lg font-mono font-semibold tabular-nums text-white">
                              {formatCurrency(calculations.val200)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DSR & Total Destaque */}
                    <div className="pt-6 border-t border-white/10 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Adicional do DSR (20%)</span>
                        <span className="text-lg font-mono font-semibold tabular-nums text-amber-300">
                          {formatCurrency(calculations.dsr)}
                        </span>
                      </div>

                      <motion.div
                        key={calculations.totalOvertimeWithDsr}
                        initial={{ opacity: 0.85, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className="bg-gradient-to-br from-amber-500 via-pink-600 to-fuchsia-700 p-6 rounded-xl text-white shadow-xl shadow-pink-950/50 border border-white/20"
                      >
                        <p className="text-xs font-semibold tracking-wide text-white/90 mb-1">
                          Total em Horas Extras + DSR
                        </p>
                        <div className="flex justify-between items-end gap-4">
                          <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
                            {formatCurrency(calculations.totalOvertimeWithDsr)}
                          </p>
                          <Clock className="w-7 h-7 text-white/30 shrink-0" />
                        </div>
                        <button
                          type="button"
                          onClick={saveToHistory}
                          className="w-full mt-5 bg-[#0d0818] hover:bg-[#170f2b] text-white font-semibold py-2.5 px-4 rounded-lg border border-white/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                        >
                          Salvar no Histórico
                        </button>
                      </motion.div>
                    </div>

                    {/* Salário Base & Total Bruto */}
                    <div className="pt-5 border-t border-dashed border-white/15 space-y-3">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-sm">Salário Base ({workload}h)</span>
                        <span className="font-mono tabular-nums text-slate-100">
                          {formatCurrency(calculations.baseSalary)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-white/10">
                        <span className="text-sm font-bold text-white">Total Bruto Estimado</span>
                        <span className="text-xl font-mono font-bold tabular-nums text-amber-300">
                          {formatCurrency(calculations.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Histórico */}
                    <div className="pt-6 border-t border-white/10">
                      <h3 className="font-display text-lg font-bold text-white mb-4">Histórico</h3>
                      {history.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Nenhum registro salvo no histórico ainda.
                        </p>
                      ) : (
                        <div className="divide-y divide-white/10 border border-white/10 rounded-xl bg-[#130c22]/65 overflow-hidden">
                          {history.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex justify-between items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{entry.period}</p>
                                <p className="text-xs text-slate-400 tabular-nums">
                                  Salvo em {new Date(entry.dateSaved).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <p className="text-sm font-mono font-semibold tabular-nums text-pink-300">
                                  {formatCurrency(entry.totalOvertimeWithDsr)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => deleteHistoryEntry(entry.id)}
                                  className="text-xs font-semibold text-rose-300 hover:text-rose-200 px-2 py-1 rounded hover:bg-rose-500/15 transition-colors cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <footer className="mt-8 pt-5 border-t border-white/10 space-y-2.5">
              <p className="text-xs text-slate-400 leading-relaxed">
                Os valores acima descritos referem-se apenas a uma simulação do cálculo das Horas Extras.
                Estes valores serão somados ao salário mensal para compor a base de cálculo dos descontos de INSS e Imposto de Renda.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-300/90">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Lembrete: O pagamento correto depende da manutenção do ponto no sistema.</span>
              </div>
            </footer>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
