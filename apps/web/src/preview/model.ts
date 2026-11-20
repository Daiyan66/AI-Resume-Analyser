export type Role = 'candidate' | 'recruiter' | 'admin'
export type Job = {
  id: string; title: string; team: string; location: string; work: string; salary: string
  description: string; question: string; criteria: string[]
  state: 'Draft' | 'Published' | 'Paused' | 'Closed' | 'Archived'
}
export const stages = ['Submitted', 'In review', 'Interview', 'Offer', 'Hired', 'Not selected', 'Withdrawn'] as const
export type Stage = typeof stages[number]
export type Application = {
  id: string; job: string; name: string; status: Stage; answer: string; document: string
  headline: string; summary: string; events: Stage[]; reviews: Record<string, string>; reason?: string
  source?: 'Direct' | 'Batch'
}
export type Profile = { name: string; email: string; headline: string; location: string; summary: string; skills: string; phone: string; experience: string; education: string; portfolio: string }
export type PreviewData = {
  jobs: Job[]; applications: Application[]; profile: Profile; documents: string[];
  updates: { id: string; application: string; message: string; read: boolean }[];
  organization: string; members: { email: string; role: string; status: string }[];
  policy: { waiting: string; retention: string; ai: boolean; wording: string };
  audit: string[]; requests: { name: string; status: string }[]; verification: string;
  scheduled: Record<string, string>; uploaded: string[]; delivery: string; preflight: string;
}
export const dashboards = {candidate: 'cdash', recruiter: 'rdash', admin: 'adash'} as const
export const seed: PreviewData = {
  organization: 'Studio North',
  jobs: [
    {id:'platform',title:'Platform Engineer',team:'Engineering',location:'Bengaluru, IN',work:'Hybrid',salary:'₹18–26 LPA',description:'Help build the services and tools that power a more transparent hiring experience. You’ll own a small platform area from design through operations.',question:'Tell us about a system you helped improve.',criteria:['Backend systems','Clear communication'],state:'Published'},
    {id:'design',title:'Product Designer',team:'Design',location:'India',work:'Remote',salary:'₹14–20 LPA',description:'Design clear, accessible workflows for candidates and hiring teams. Work closely with engineers to turn research into practical product improvements.',question:'Share a project that changed after user research.',criteria:['Interaction design','Accessibility'],state:'Published'},
    {id:'analyst',title:'People Operations Analyst',team:'People',location:'Bengaluru, IN',work:'On site',salary:'₹10–16 LPA',description:'Build reporting and onboarding processes that help hiring teams work consistently.',question:'What metric helped your team make a better decision?',criteria:['Reporting','Operational judgment'],state:'Draft'},
  ],
  applications: [
    {id:'sample',job:'design',name:'Maya Patel',status:'In review',answer:'I tested three dashboard concepts with five users and simplified the navigation.',document:'Maya-Patel-sample.txt',headline:'Product designer',summary:'I design accessible workflows and test them with users.',events:['Submitted','In review'],reviews:{},source:'Direct'},
  ],
  profile:{name:'Maya Patel',email:'maya@example.test',headline:'Product designer',location:'Bengaluru, IN',summary:'I design accessible workflows and test them with users.',skills:'Research, React, accessibility',phone:'',experience:'',education:'',portfolio:''},
  documents:['Maya-Patel-sample.txt'],
  updates:[{id:'welcome',application:'sample',message:'Your Product Designer application moved to In review.',read:false}],
  members:[{email:'admin@example.test',role:'Admin',status:'Active'},{email:'recruiter@example.test',role:'Recruiter',status:'Active'}],
  policy:{waiting:'0',retention:'365',ai:false,wording:''},
  audit:['Workspace preview created'],requests:[],verification:'No request submitted',scheduled:{},uploaded:[],delivery:'Ready for a sample delivery',preflight:'No sample selected',
}
const key = 'ats-product-preview-v1'
export function loadPreview(): PreviewData {
  try {
    const saved = localStorage.getItem(key)
    return saved ? { ...structuredClone(seed), ...JSON.parse(saved) as Partial<PreviewData> } : structuredClone(seed)
  } catch { return structuredClone(seed) }
}
export function savePreview(data: PreviewData) {
  try { localStorage.setItem(key,JSON.stringify(data)) } catch { /* Preview still works in memory. */ }
}
export const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text],{type}))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url),1000)
}
