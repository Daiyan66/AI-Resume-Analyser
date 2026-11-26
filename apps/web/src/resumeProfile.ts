import type { CandidateProfile } from './api'

const labels: Record<string, keyof CandidateProfile> = {
  'headline': 'headline', 'job title': 'headline', 'professional title': 'headline',
  'location': 'location', 'phone': 'phone', 'mobile': 'phone', 'telephone': 'phone',
  'summary': 'summary', 'professional summary': 'summary', 'career summary': 'summary', 'profile': 'summary',
  'objective': 'summary', 'career objective': 'summary', 'about me': 'summary',
  'skills': 'skills', 'technical skills': 'skills', 'core skills': 'skills', 'competencies': 'skills',
  'experience': 'experience', 'work experience': 'experience', 'professional experience': 'experience',
  'employment history': 'experience', 'work history': 'experience', 'employment': 'experience',
  'education': 'education', 'academic background': 'education', 'qualifications': 'education',
}
const sectionLimits = { summary: 4000, skills: 4000, experience: 8000, education: 4000 } as const
const otherSections = /^(?:projects|certifications|awards|honou?rs|languages|interests|volunteer(?:ing| experience)?|references|contact(?: information)?|publications|achievements|links)$/i

export function resumeProfile(text: string): Partial<CandidateProfile> {
  const fields: Partial<CandidateProfile> = {}
  let section: keyof typeof sectionLimits | undefined
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    const separator = line.indexOf(':')
    const label = (separator < 0 ? line : line.slice(0, separator)).trim().toLowerCase()
    const field = Object.hasOwn(labels, label) ? labels[label] : undefined
    const value = separator < 0 ? '' : line.slice(separator + 1).trim()

    if (field === 'summary' || field === 'skills' || field === 'experience' || field === 'education') {
      section = field
      if (value) fields[field] = value.slice(0, sectionLimits[field])
    } else if (field) {
      if (value) fields[field] = value.slice(0, field === 'phone' ? 40 : 160)
      section = undefined
    } else if (otherSections.test(label)) {
      section = undefined
    } else if (section && line) {
      fields[section] = [fields[section], line].filter(Boolean).join('\n').slice(0, sectionLimits[section])
    }
  }
  if (!fields.phone) {
    const phone = text.split(/\r?\n/).slice(0, 8).map(line => line.trim())
      .find(line => /^\+?[\d ()-]{8,25}$/.test(line) && line.replace(/\D/g, '').length >= 9)
    if (phone) fields.phone = phone
  }
  return fields
}
