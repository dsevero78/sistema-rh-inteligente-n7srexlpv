import React from 'react'
import { cn } from '@/lib/utils'

export type StatusChipKind = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind?: StatusChipKind
  dot?: boolean
  children: React.ReactNode
}

const kindStyles: Record<
  StatusChipKind,
  { bg: string; text: string; border: string; dot: string }
> = {
  neutral: {
    bg: 'bg-[#F2F4F8]',
    text: 'text-[#4D5566]',
    border: 'border-[#D7DCE6]',
    dot: 'bg-[#6B7384]',
  },
  success: {
    bg: 'bg-[#DDF3E8]',
    text: 'text-[#0E5234]',
    border: 'border-[#b8e4cf]',
    dot: 'bg-[#1F9D6A]',
  },
  warning: {
    bg: 'bg-[#FBF1D2]',
    text: 'text-[#875A00]',
    border: 'border-[#f5df9a]',
    dot: 'bg-[#E5A700]',
  },
  danger: {
    bg: 'bg-[#F8DDD9]',
    text: 'text-[#8B1E14]',
    border: 'border-[#f1b4ac]',
    dot: 'bg-[#D5392C]',
  },
  info: {
    bg: 'bg-[#DCE6FA]',
    text: 'text-[#1D3E78]',
    border: 'border-[#b4ccf4]',
    dot: 'bg-[#345EA9]',
  },
  brand: {
    bg: 'bg-[#FEF1EA]',
    text: 'text-[#9B340A]',
    border: 'border-[#FBDCC9]',
    dot: 'bg-[#E9530E]',
  },
}

export function StatusChip({
  kind = 'neutral',
  dot = true,
  children,
  className,
  ...props
}: StatusChipProps) {
  const s = kindStyles[kind] || kindStyles.neutral
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border',
        s.bg,
        s.text,
        s.border,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.dot)} />}
      <span>{children}</span>
    </span>
  )
}

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  accent?: boolean
  icon?: React.ReactNode
  trend?: {
    value: string | number
    isPositive?: boolean
  }
}

export function KpiCard({
  label,
  value,
  hint,
  accent = false,
  icon,
  trend,
  className,
  ...props
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl border border-[#E7EAF0] p-5 shadow-[0_1px_3px_rgba(11,18,48,0.06)] hover:border-[#D7DCE6] hover:shadow-[0_4px_12px_rgba(11,18,48,0.06)] transition-all duration-200 overflow-hidden',
        className,
      )}
      {...props}
    >
      {accent && <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E9530E]" />}
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7384]">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#FEF1EA] text-[#E9530E] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#212B55]">{value}</span>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-1.5 py-0.2 rounded',
              trend.isPositive ? 'bg-[#DDF3E8] text-[#1F9D6A]' : 'bg-[#F8DDD9] text-[#D5392C]',
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {hint && <p className="mt-1 text-xs text-[#6B7384] line-clamp-1">{hint}</p>}
    </div>
  )
}

interface HeroPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string
  title: string
  body?: string
  cta?: React.ReactNode
}

export function HeroPanel({ eyebrow, title, body, cta, className, ...props }: HeroPanelProps) {
  return (
    <div
      className={cn(
        'relative bg-[#212B55] text-white rounded-2xl p-6 md:p-8 overflow-hidden shadow-[0_8px_24px_rgba(11,18,48,0.18)]',
        className,
      )}
      {...props}
    >
      {/* Geometria SouYess conector em laranja no canto superior direito */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 bg-[#E9530E] rounded-bl-[140px] opacity-90 z-0" />
      <div className="pointer-events-none absolute top-16 right-16 w-16 h-16 rounded-full border-4 border-[#E9530E] bg-[#212B55] z-0" />

      <div className="relative z-10 max-w-2xl">
        {eyebrow && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F19763] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9530E]" />
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wide text-white leading-tight">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm text-[#D3D7E5] leading-relaxed max-w-xl">{body}</p>}
        {cta && <div className="mt-5 flex flex-wrap items-center gap-3">{cta}</div>}
      </div>
    </div>
  )
}
