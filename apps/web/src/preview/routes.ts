import catalog from './screens.json'
export type Screen = (typeof catalog)[number]
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const primary = {
  home:'/', jobs:'/jobs', job:'/jobs/detail', login:'/sign-in', register:'/register',
  cdash:'/candidate', rdash:'/recruiter', adash:'/admin', account:'/account',
} as Record<string,string>
export const screens = catalog
export const byId = new Map(screens.map(screen=>[screen.id,screen]))
export function href(id: string, params?: Record<string,string>) {
  const screen = byId.get(id)
  const path = primary[id] ?? (screen ? '/'+(screen.area==='Public' ? 'auth' : screen.area.toLowerCase())+'/'+slug(screen.title) : '/')
  return path + (params && Object.keys(params).length ? '?'+new URLSearchParams(params) : '')
}
const paths = new Map(screens.map(screen=>[href(screen.id),screen.id]))
export function currentScreen() {
  return paths.get(window.location.pathname.replace(/\/$/,'') || '/') ?? 'states'
}
