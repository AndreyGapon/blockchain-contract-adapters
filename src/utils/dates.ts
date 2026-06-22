import {
  format,
  FormatOptions,
} from 'date-fns'
export const DATE_FORMAT = 'MMM d, yyyy'

export const SECONDS_PER_YEAR = 60 * 60 * 24 * 365

export const formatDate = (date: string | number | Date, formatStr = DATE_FORMAT, options?: FormatOptions): string => {
  return format(date, formatStr, options)
}

export const yearsToSeconds = (years: number) => SECONDS_PER_YEAR * years
