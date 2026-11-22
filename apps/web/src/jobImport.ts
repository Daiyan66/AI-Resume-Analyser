type Digest = { title: string; description: string }
const fields: Record<string, string> = {
  'job title': 'title', title: 'title', position: 'title', role: 'title', location: 'location', 'job location': 'location',
  'work arrangement': 'workType', 'work type': 'workType', 'work model': 'workType', workplace: 'workType',
  'role description': 'description', 'job description': 'description', 'about the role': 'description',
  description: 'description', overview: 'description', responsibilities: 'description',
  requirements: 'requirements', 'minimum qualifications': 'requirements', 'required qualifications': 'requirements',
  'preferred qualifications': 'requirements', qualifications: 'requirements', 'required skills': 'requirements',
  'screening questions': 'questions', 'minimum salary': 'salaryMin', 'maximum salary': 'salaryMax', currency: 'currency',
}
const types: Record<string, string> = { remote: 'REMOTE', hybrid: 'HYBRID', 'on-site': 'ONSITE', onsite: 'ONSITE', 'on site': 'ONSITE' }
const limits: Record<string, number> = { title: 160, location: 160, description: 20000, requirements: 10000, questions: 5010 }
const sections = ['description', 'requirements', 'questions']

export function jobImport(digest: Digest): Record<string, string> {
  const draft: Record<string, string> = {}
  let section = ''
  let pendingField = ''
  const preamble: string[] = []
  for (const line of digest.description.split(/\r?\n/)) {
    const separator = line.indexOf(':')
    const label = (separator === -1 ? line : line.slice(0, separator)).trim().replace(/^#+\s*/, '').toLowerCase()
    const field = Object.hasOwn(fields, label) ? fields[label] : ''
    const value = separator === -1 ? '' : line.slice(separator + 1).trim()
    if (field) {
      section = sections.includes(field) ? field : ''
      pendingField = !section && !value ? field : ''
      if (value) draft[field] = draft[field] && section ? draft[field] + '\n' + value : value
    } else if (pendingField && line.trim()) {
      draft[pendingField] = line.trim()
      pendingField = ''
    } else if (section) {
      draft[section] = (draft[section] ?? '') + '\n' + line
    } else if (line.trim()) {
      preamble.push(line.trim())
    }
  }
  if (!draft.title && preamble[0] && preamble[0].length <= 90 &&
      !/[.:!?]$/.test(preamble[0]) && preamble[0].split(/\s+/).length <= 10) draft.title = preamble.shift() ?? ''
  draft.title ||= digest.title
  draft.description ||= preamble.join('\n') || digest.description
  if (draft.workType) draft.workType = types[draft.workType.toLowerCase()] ?? ''
  draft.currency = (draft.currency ?? '').toUpperCase()
  for (const field of ['salaryMin', 'salaryMax']) {
    const value = (draft[field] ?? '').replace(/,/g, '')
    draft[field] = /^\d+$/.test(value) && Number(value) <= 2_147_483_647 ? value : ''
  }
  if (!draft.salaryMin || !draft.salaryMax || Number(draft.salaryMin) > Number(draft.salaryMax) ||
      !/^[A-Z]{3}$/.test(draft.currency)) {
    delete draft.salaryMin
    delete draft.salaryMax
    delete draft.currency
  }
  for (const [field, limit] of Object.entries(limits)) {
    if (draft[field]) draft[field] = draft[field].trim().slice(0, limit)
  }
  return draft
}
