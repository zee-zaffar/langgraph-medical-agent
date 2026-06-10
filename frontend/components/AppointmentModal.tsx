'use client'
import { useState, useEffect } from 'react'
import { bookAppointmentCall } from '@/lib/api'

interface AppointmentModalProps {
  specialist: string
  specialistIcon: string
  onClose: () => void
}

type Step = 'form' | 'calling' | 'confirmed'

interface Confirmed {
  name: string
  date: string
  time: string
}

const CALLING_STEPS = [
  { icon: '📞', text: 'Dialing clinic…' },
  { icon: '☎️', text: 'Connected — scheduling your appointment…' },
  { icon: '✅', text: 'Appointment booked!' },
]

const STEP_DURATIONS = [1600, 2000]   // ms between steps 0→1 and 1→2

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

export default function AppointmentModal({ specialist, specialistIcon, onClose }: AppointmentModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [callingStep, setCallingStep] = useState(0)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [clinicNumber, setClinicNumber] = useState('+12242327850')
  const [callError, setCallError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // Drive the calling animation
  useEffect(() => {
    if (step !== 'calling') return
    if (callingStep < CALLING_STEPS.length - 1) {
      const timer = setTimeout(
        () => setCallingStep(s => s + 1),
        STEP_DURATIONS[callingStep] ?? 1500,
      )
      return () => clearTimeout(timer)
    }
    // last animation step reached — wait for API (handled in handleBook)
  }, [step, callingStep])

  const handleBook = async () => {
    if (!name.trim() || !date || !clinicNumber.trim()) return
    setConfirmed({ name: name.trim(), date, time })
    setCallError(null)
    setCallingStep(0)
    setStep('calling')

    // Advance animation while the API call runs
    try {
      const result = await bookAppointmentCall({
        patient_name: name.trim(),
        specialist,
        date,
        time,
        clinic_number: clinicNumber.trim(),
      })
      // Show any skipped/info message from the backend (e.g. Twilio not configured)
      if (result.status === 'skipped') {
        setCallError(result.message)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setCallError(msg)
    }
    // Always advance to confirmed so the user can still download the calendar entry
    setCallingStep(CALLING_STEPS.length - 1)
    setTimeout(() => setStep('confirmed'), 900)
  }

  const handleAddToCalendar = () => {
    if (!confirmed) return
    const { name: patientName, date: apptDate, time: apptTime } = confirmed

    // Build ICS datetime strings (local time, no timezone suffix for simplicity)
    const datePart = apptDate.replace(/-/g, '')
    const [h, m] = apptTime.split(':').map(Number)
    const startStr = `${datePart}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`
    const endH = String(h + 1).padStart(2, '0')
    const endStr = `${datePart}T${endH}${String(m).padStart(2, '0')}00`

    const specialistLabel = specialist.charAt(0).toUpperCase() + specialist.slice(1)

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MedAI Assistant//Appointment//EN',
      'BEGIN:VEVENT',
      `UID:medai-${Date.now()}@medai`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${specialistLabel} Appointment`,
      `DESCRIPTION:Medical appointment with ${specialistLabel} specialist.\\nPatient: ${patientName}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${specialist}-appointment-${apptDate}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formattedDate = confirmed
    ? new Date(confirmed.date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{specialistIcon}</span>
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Book an Appointment</h2>
              <p className="text-xs text-slate-400 capitalize">{specialist} specialist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
          >
            &times;
          </button>
        </div>

        {/* ── STEP 1: Form ────────────────────────────────── */}
        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Your name</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400"
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Preferred date</label>
                <input
                  type="date"
                  min={today}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Preferred time</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                >
                  {TIME_SLOTS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Clinic phone number</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400"
                placeholder="+44 20 1234 5678 (E.164 format)"
                value={clinicNumber}
                onChange={e => setClinicNumber(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Demo: only <span className="font-mono">+12242327850</span> will ring (Twilio trial)</p>
            </div>

            <button
              onClick={handleBook}
              disabled={!name.trim() || !date || !clinicNumber.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>📞</span> Call &amp; Book Appointment
            </button>

            <p className="text-center text-xs text-slate-400">
              We&apos;ll call the clinic on your behalf and confirm availability.
            </p>
          </div>
        )}

        {/* ── STEP 2: Calling animation ───────────────────── */}
        {step === 'calling' && (
          <div className="flex flex-col items-center gap-5 py-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-3xl animate-bounce shadow-inner">
              {CALLING_STEPS[callingStep].icon}
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-800">{CALLING_STEPS[callingStep].text}</p>
              <p className="text-xs text-slate-400 mt-1 capitalize">{specialist} clinic</p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${((callingStep + 1) / CALLING_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">Please wait…</p>
          </div>
        )}

        {/* ── STEP 3: Confirmed ───────────────────────────── */}
        {step === 'confirmed' && confirmed && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-3xl shadow-inner">
                ✅
              </div>
              <p className="font-semibold text-slate-800">Appointment Confirmed!</p>
              <p className="text-xs text-slate-500 text-center">{formattedDate} at {confirmed.time}</p>
            </div>

            {/* Call result notice */}
            {callError ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                <span className="shrink-0">⚠️</span>
                <span>{callError}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800">
                <span>📞</span>
                <span>Call placed to clinic — they will confirm shortly.</span>
              </div>
            )}

            {/* Summary card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm space-y-2">
              {[
                { label: 'Patient',    value: confirmed.name },
                { label: 'Specialist', value: specialist.charAt(0).toUpperCase() + specialist.slice(1) },
                { label: 'Date',       value: formattedDate },
                { label: 'Time',       value: confirmed.time },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="font-medium text-slate-700">{row.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddToCalendar}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>📅</span> Add to Calendar (.ics)
            </button>

            <button
              onClick={onClose}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl py-2 text-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
