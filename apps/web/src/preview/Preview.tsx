import { useEffect, useState } from 'react'
import type { FormEvent, MouseEvent, ReactNode } from 'react'
import { byId, currentScreen, href, screens } from './routes'
import type { Screen } from './routes'
import { dashboards, download, loadPreview, newId, savePreview, stages } from './model'
import type { Application, Job, PreviewData, Role, Stage } from './model'
import './preview.css'

type Params = Record<string,string>
type Navigate = (id: string, params?: Params) => void
const roleLabel = {candidate:'Candidate',recruiter:'Recruiter',admin:'Admin'}
const nav: Record<Role,[string,string][]> = {
  candidate:[['cdash','Overview'],['jobs','Find jobs'],['apps','Applications'],['updates','Updates'],['profile','Profile'],['docs','Documents'],['data','Privacy & data']],
  recruiter:[['rdash','Overview'],['rjobs','Jobs'],['pipeline','Applicants'],['batch','Batch screening'],['funnel','Reports'],['updates','Updates']],
  admin:[['adash','Overview'],['org','Organizations'],['members','Team & access'],['requests','Verification'],['directory','Candidates'],['users','Accounts'],['policy','Policies'],['audit','Audit log'],['requestsdata','Data requests'],['delivery','Delivery'],['migration','Migration']],
}
const readParams = () => Object.fromEntries(new URLSearchParams(location.search))
const roleKey = 'ats-preview-role'
const active = (a: Application) => !['Hired','Not selected','Withdrawn'].includes(a.status)
const money = (n: number) => String(n).padStart(2,'0')

function Link({go,id,params,children,className,current}:{
  go:Navigate; id:string; params?:Params; children:ReactNode; className?:string; current?:boolean
}) {
  function click(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    go(id,params)
  }
  return <a href={href(id,params)} className={className} onClick={click} aria-current={current?'page':undefined}>{children}</a>
}
function Pill({children}: {children: ReactNode}) {
  return <span className="pv-pill">{children}</span>
}
function Field({name,label,value,type='text',required=false,options,area,min,max}:{
  name:string; label:string; value?:string; type?:string; required?:boolean; options?:string[]; area?:boolean; min?:number; max?:number
}) {
  return <label className="pv-field">{label}
    {options ? <select name={name} defaultValue={value} required={required}>{options.map(o=><option key={o}>{o}</option>)}</select>
      : area ? <textarea name={name} defaultValue={value} required={required} rows={4}/>
      : <input name={name} type={type} defaultValue={type==='file'?undefined:value} required={required} min={type==='number'?min:undefined} max={type==='number'?max:undefined} minLength={type==='password'?min:undefined} maxLength={type==='password'?max:undefined} accept={type==='file'?'.pdf,.docx,.txt,.csv':undefined}/>}
  </label>
}
function Empty({title,detail,children}:{title:string; detail:string; children?:ReactNode}) {
  return <div className="pv-empty"><strong>{title}</strong><p>{detail}</p>{children}</div>
}
function Form({label,submit,children}:{label:string;submit:(form:FormData)=>void;children:ReactNode}) {
  function onSubmit(e:FormEvent<HTMLFormElement>) {e.preventDefault();submit(new FormData(e.currentTarget))}
  return <form className="pv-card pv-form" onSubmit={onSubmit}>{children}<button className="pv-button primary">{label}</button></form>
}
function Rows({headers,rows}:{headers:string[];rows:{key:string;cells:ReactNode[]}[]}) {
  return <div className="pv-table-wrap"><table className="pv-table" role="table"><thead><tr>{headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map(r=><tr key={r.key}>{r.cells.map((cell,i)=><td key={headers[i]} data-label={headers[i]}>{cell}</td>)}</tr>)}</tbody></table></div>
}
export default function Preview() {
  const [route,setRoute] = useState(()=>({ id:currentScreen(),params:readParams() }))
  const [data,setData] = useState(loadPreview)
  const [role,setRole] = useState<Role|null>(()=>{try { const saved=localStorage.getItem(roleKey) as Role;return saved in dashboards?saved:null } catch {return null}})
  const [applicationDraft,setApplicationDraft] = useState<{ job:string; answer:string; document:string }|null>(null)
  const [jobDraft,setJobDraft] = useState<{title:string; description:string}|null>(null)
  const [feedback,setFeedback] = useState<{text:string;error?:boolean}|null>(null)
  const screen = byId.get(route.id)!
  const {id,params} = route
  const job = params.job ? data.jobs.find(j=>j.id===params.job) : data.jobs.find(j=>j.state==='Published')
  const application = params.application ? data.applications.find(a=>a.id===params.application) : undefined
  const draft = applicationDraft?.job===job?.id ? applicationDraft : null
  const isPublicJob = id==='jobs'||id==='job'
  const inWorkspace = !!role && (screen.area!=='Public' || isPublicJob)
  const required = screen.area==='Candidate' && !['profilelegacy','profilelegacyreview'].includes(id) ? 'candidate'
    : screen.area==='Recruiter' ? 'recruiter' : screen.area==='Admin' ? 'admin' : null
  const contextual = {...(job?{job:job.id}:{}),...(application?{application:application.id}:{}),...params}
  const unread = data.updates.filter(n=>!n.read).length

  useEffect(()=>{const pop=()=>{setRoute({id:currentScreen(),params:readParams()});setFeedback(null)};window.addEventListener('popstate',pop);return ()=>window.removeEventListener('popstate',pop)},[])
  useEffect(()=>savePreview(data),[data])
  useEffect(()=>{document.title=id==='home'?'AI Resume Analyser':screen.title+' · AI Resume Analyser'},[id,screen.title])

  function go(target:string,next?:Params) {
    const url=href(target,next)
    if (location.pathname+location.search!==url) history.pushState(null,'',url)
    setRoute({id:target,params:next??{}})
    setFeedback(null)
    requestAnimationFrame(()=>{document.getElementById('preview-content')?.focus({preventScroll:true});window.scrollTo(0,0)})
  }
  function switchRole(next:Role) {
    setRole(next)
    try { localStorage.setItem(roleKey,next) } catch { /* Session can still continue. */ }
    if (next==='candidate' && params.next==='apply') go('apply',{job:params.job||job?.id||''})
    else go(dashboards[next])
  }
  function signOut() {
    setRole(null)
    try {localStorage.removeItem(roleKey)} catch { /* Session was only in memory. */ }
    go('login')
  }
  function notify(text:string,error=false) {setFeedback({text,error})}
  function mutate(update:(prev:PreviewData)=>PreviewData,audit?:string) {
    setData(prev=>{const result=update(prev);return audit?{...result,audit:[audit,...result.audit]}:result})
  }
  const link=(target:string,label:string,next?:Params,className='pv-button')=><Link go={go} id={target} params={next} className={className}>{label}</Link>
  const act=(label:string,fn:()=>void,primary=false)=><button type="button" className={'pv-button'+(primary?' primary':'')} onClick={fn}>{label}</button>
  const value=(form:FormData,key:string)=>String(form.get(key)??'').trim()
  const currentJob=(a:Application)=>data.jobs.find(j=>j.id===a.job)
  function changeStage(a:Application,status:Stage,reason?:string) {
    const title=currentJob(a)?.title??'Your job'
    mutate(prev=>({...prev,applications:prev.applications.map(item=>item.id===a.id?{...item,status,reason:reason??item.reason,events:[...item.events,status]}:item),updates:[{id:newId(),application:a.id,message:title+' · '+status,read:false},...prev.updates]}),'Application moved to '+status)
  }
  function submitApplication() {
    if (!job || job.state!=='Published') return notify('This role is no longer accepting applications.',true)
    if (data.applications.some(a=>a.job===job.id&&a.source!=='Batch'&&active(a))) return notify('You already have an active application for this job.',true)
    if (!data.profile.headline.trim()||!data.profile.summary.trim()) return notify('Add a headline and summary to your profile before submitting.',true)
    if (job.question&&!draft?.answer.trim()) return notify('Answer the screening question before submitting.',true)
    const a:Application={id:newId(),job:job.id,name:data.profile.name,headline:data.profile.headline,summary:data.profile.summary,answer:draft?.answer??'',document:draft?.document??'',status:'Submitted',events:['Submitted'],reviews:{},source:'Direct'}
    mutate(prev=>({...prev,applications:[a,...prev.applications]}),'Application submitted')
    setApplicationDraft(null)
    go('receipt',{job:job.id,application:a.id})
  }
  function saveJob(form:FormData) {
    const existing=params.job?data.jobs.find(j=>j.id===params.job):undefined
    if (existing&&existing.state!=='Draft') return notify('Only draft jobs can be edited.',true)
    const item:Job={id:existing?.id??newId(),title:value(form,'title'),team:value(form,'team'),location:value(form,'location'),work:value(form,'work'),salary:value(form,'salary'),description:value(form,'description'),question:value(form,'question'),criteria:value(form,'criteria').split('\n').map(v=>v.trim()).filter(Boolean),state:'Draft'}
    if (!item.title||!item.team||!item.location||!item.description||!item.criteria.length) return notify('Complete the job details and add at least one criterion.',true)
    setJobDraft(null)
    mutate(prev=>({...prev,jobs:existing?prev.jobs.map(j=>j.id===item.id?item:j):[item,...prev.jobs]}),'Saved draft · '+item.title)
    go('rjob',{job:item.id})
  }
  function jobStatus() {
    if (!job) return
    const desired=params.state as Job['state']
    const allowed:Record<Job['state'],Job['state'][]>= {Draft:['Published'],Published:['Paused','Closed'],Paused:['Published','Closed'],Closed:['Archived'],Archived:[]}
    if (!allowed[job.state].includes(desired)) return notify('Choose a valid status change from the job detail.',true)
    mutate(prev=>({...prev,jobs:prev.jobs.map(j=>j.id===job.id?{...j,state:desired}:j)}),job.title+' · '+desired)
    go('rjob',{job:job.id})
  }
  const panel=(title:string,children:ReactNode)=><section className="pv-card"><h2>{title}</h2>{children}</section>
  const appLink=(a:Application,label='View application')=>link('app',label,{application:a.id,job:a.job})
  const jobParams=job?{job:job.id}:undefined
  function jobCards(list:Job[],target:string) {
    return list.length?<div className="pv-grid jobs">{list.map(j=><article className="pv-card pv-job" key={j.id}>
      <div className="pv-job-top"><span className="pv-symbol">{j.team.slice(0,2).toUpperCase()}</span><Pill>{target==='job'?j.work:j.state}</Pill></div>
      <h2>{j.title}</h2><p>{data.organization} · {j.location}</p><p className="pv-salary">{j.salary||'Compensation not listed'}</p>
      {link(target,target==='job'?'View job':'Manage job',{job:j.id})}
    </article>)}</div>:<Empty title="No matching jobs" detail="Try a different search or clear the filters."/>
  }
  function applications(recruiter=false) {
    const filter=params.stage
    const items=data.applications.filter(a=>(recruiter||a.source!=='Batch')&&(!recruiter||!params.job||a.job===params.job)&&(!filter||a.status===filter)&&(!params.source||a.source===params.source))
    return <>
      <Form label="Apply filters" submit={f=>go(id,{...(params.job?{job:params.job}:{}),...(value(f,'stage')!=='All stages'?{stage:value(f,'stage')}:{}),...(recruiter&&value(f,'source')!=='All sources'?{source:value(f,'source')}:{})})}><div className="pv-grid fields"><Field name="stage" label="Stage" options={['All stages',...stages]} value={filter}/>{recruiter&&<Field name="source" label="Source" options={['All sources','Direct','Batch']} value={params.source}/>}</div></Form>
      {items.length?<Rows headers={[recruiter?'Candidate':'Job',recruiter?'Job':'Organization','Stage','Action']} rows={items.map(a=>({key:a.id,cells:[recruiter?a.name:currentJob(a)?.title,recruiter?currentJob(a)?.title:data.organization,<Pill key="status">{a.status}</Pill>,recruiter?link('review','Review',{application:a.id,job:a.job}):appLink(a)]}))}/>:<Empty title="No applications here yet" detail="New applications appear here once submitted.">{recruiter?link('rjobs','Manage jobs'):link('jobs','Browse jobs')}</Empty>}
    </>
  }
  function overview(kind:Role) {
    const counts=kind==='candidate'?[['Applications',data.applications.filter(a=>a.source!=='Batch').length,'apps'],['Unread updates',unread,'updates'],['Documents',data.documents.length,'docs']]
      :kind==='recruiter'?[['Published jobs',data.jobs.filter(j=>j.state==='Published').length,'rjobs'],['Active applicants',data.applications.filter(active).length,'pipeline'],['Batch files',data.uploaded.length,'batch']]
      :[['Team members',data.members.filter(m=>m.status!=='Revoked').length,'members'],['Published jobs',data.jobs.filter(j=>j.state==='Published').length,'rjobs'],['Data requests',data.requests.length,'requestsdata']]
    return <><section className="pv-welcome"><div><p>{kind==='candidate'?'YOUR CAREER WORKSPACE':data.organization.toUpperCase()}</p><h2>{kind==='candidate'?'Welcome, '+data.profile.name.split(' ')[0]:'Your hiring overview'}</h2>
      <p>{kind==='candidate'?'Pick up where you left off.':kind==='recruiter'?'See what is open and move applications forward.':'Manage your team, policies, and hiring activity.'}</p></div>
      {link(kind==='candidate'?'jobs':kind==='recruiter'?'jobedit':'memberinvite',kind==='candidate'?'Find jobs':kind==='recruiter'?'Create job':'Invite a member',undefined,'pv-button light')}</section>
      <div className="pv-grid stats">{counts.map(([label,count,target])=><Link key={label} go={go} id={String(target)} className="pv-card pv-stat"><span>{label}</span><strong>{money(Number(count))}</strong><small>View details</small></Link>)}</div>
      {kind==='candidate'?panel('Latest activity',data.updates.length?<ul className="pv-list">{data.updates.slice(0,3).map(n=><li key={n.id}>{n.message}{link('app','View',{application:n.application})}</li>)}</ul>:<p>No updates yet.</p>)
        :kind==='recruiter'?panel('Recent applicants',<ul className="pv-list">{data.applications.slice(0,4).map(a=><li key={a.id}><span>{a.name} · {currentJob(a)?.title}</span>{link('review','Review',{job:a.job,application:a.id})}</li>)}</ul>)
        :panel('Recent activity',<ul className="pv-list">{data.audit.slice(0,5).map((a,i)=><li key={i}>{a}</li>)}</ul>)}
    </>
  }

  function core(): ReactNode {
    switch(id) {
      case 'home': return <Home go={go}/>
      case 'login': return <div className="pv-auth"><div><p className="pv-kicker">ONE ACCOUNT, THREE WORKSPACES</p><h2>Pick up where you left off.</h2><p>Choose a sample role to explore its workspace. No real credentials are needed.</p><div className="pv-actions">{(Object.keys(dashboards) as Role[]).map(r=><button className="pv-button" key={r} onClick={()=>switchRole(r)}>Continue as {roleLabel[r]}</button>)}</div></div><div>
        <Form label="Sign in to preview" submit={f=>switchRole(value(f,'role').toLowerCase() as Role)}><Field name="email" label="Sample email" type="email" value="maya@example.test" required/><Field name="role" label="Workspace" options={['Candidate','Recruiter','Admin']} /></Form>
        <div className="pv-actions">{link('register','Create account')}{link('forgot','Forgot password?')}{link('verify','Resend verification')}{link('access','Recruiter access')}</div></div></div>
      case 'register': return <Form label="Create preview account" submit={f=>{
        if(value(f,'password')!==value(f,'confirm')) return notify('The passwords do not match.',true)
        mutate(prev=>({...prev,profile:{...prev.profile,name:value(f,'name'),email:value(f,'email')}}));go('verify')
      }}><p>Use fictional details for this preview.</p><Field name="name" label="Display name" required/><Field name="email" label="Sample email" type="email" required/><Field name="password" label="Sample password · at least 12 characters" type="password" min={12} max={128} required/><Field name="confirm" label="Confirm password" type="password" required/><div className="pv-actions">{link('login','Already registered? Sign in')}{link('profilelegacy','Extended profile setup')}{link('access','Request recruiter access')}</div></Form>
      case 'verify': return panel('Email verification',<><p>In the live service, a link would go to your inbox. Open the sample link to continue.</p><div className="pv-actions">{act('Resend sample email',()=>notify('A verification message would be sent.'))}{link('login','Open sample verification link',undefined,'pv-button primary')}</div></>)
      case 'jobs': return <><Form label="Search jobs" submit={f=>go('jobs',{q:value(f,'q'),work:value(f,'work')})}><div className="pv-grid fields"><Field name="q" label="Role, location or keyword" value={params.q}/><Field name="work" label="Work arrangement" options={['Any arrangement','Remote','Hybrid','On site']} value={params.work}/></div>{link('jobs','Clear filters')}</Form>{jobCards(data.jobs.filter(j=>j.state==='Published'&&(!params.work||params.work==='Any arrangement'||j.work===params.work)&&(!params.q||[j.title,j.description,j.location,j.team].join(' ').toLowerCase().includes(params.q.toLowerCase()))),'job')}</>
      case 'job': return job?.state==='Published'?panel(job.title,<><p>{data.organization} · {job.location} · {job.work}</p><p>{job.salary}</p><p>{job.description}</p><h3>What we’re looking for</h3><ul>{job.criteria.map(c=><li key={c}>{c}</li>)}</ul><div className="pv-actions">{role==='candidate'?link('apply','Apply to this job',jobParams,'pv-button primary'):link('login','Sign in to apply',{...jobParams,next:'apply'},'pv-button primary')}{link('jobs','Back to jobs')}</div></>):<Empty title="Job unavailable" detail="This role is not currently public.">{link('jobs','Browse jobs')}</Empty>
      case 'cdash':return overview('candidate')
      case 'rdash':return overview('recruiter')
      case 'adash':return overview('admin')
      case 'profile':return <Form label="Save profile" submit={f=>{const next=Object.fromEntries(Object.keys(data.profile).map(k=>[k,value(f,k)])) as typeof data.profile;mutate(p=>({...p,profile:next}));notify('Profile saved.')}}>
        <div className="pv-grid fields">{(['name','email','headline','location','phone','skills','experience','education','portfolio','summary'] as const).map(k=><Field key={k} name={k} label={k[0].toUpperCase()+k.slice(1)} value={data.profile[k]} required={['name','email','headline','summary'].includes(k)} type={k==='email'?'email':'text'} area={k==='summary'}/>)}</div>{link('docs','Manage documents')}</Form>
      case 'docs':return <><Form label="Upload sample document" submit={f=>{const file=f.get('file');if(!(file instanceof File)||!file.name)return notify('Choose a document first.',true)
        if(!/\.(pdf|docx|txt)$/i.test(file.name)||file.size>10*1024*1024)return notify('Choose a PDF, DOCX or TXT file under 10 MB.',true)
        mutate(p=>({...p,documents:[...new Set([...p.documents,file.name])]}));notify('Sample document name saved.')}}><p>Choose a fictional résumé. The preview keeps the filename only.</p><Field name="file" label="Résumé file" type="file" required/></Form>
        {data.documents.length?panel('Saved documents',<ul className="pv-list">{data.documents.map(d=><li key={d}><strong>{d}</strong><div className="pv-actions">{act('Download sample',()=>download('sample-resume.txt','Fictional résumé · '+d))}{act('Remove',()=>{mutate(p=>({...p,documents:p.documents.filter(n=>n!==d)}));notify('Document removed from the library.')})}</div></li>)}</ul>):<Empty title="No documents yet" detail="Add a sample résumé to select it on an application."/>}</>
      case 'apply':return job?.state==='Published'?<Form label="Review application" submit={f=>{setApplicationDraft({job:job.id,document:value(f,'document')==='No attachment'?'':value(f,'document'),answer:value(f,'answer')});go('applyreview',{job:job.id})}}>
        <h2>{job.title}</h2><p>Submitted as {data.profile.name}. Your profile is copied into the application when you submit it.</p>
        <Field name="document" label="Résumé" options={['No attachment',...data.documents]} value={draft?.document}/>{job.question&&<Field name="answer" label={job.question} value={draft?.answer} area required/>}
        <div className="pv-actions">{link('profile','Edit profile')}{link('docs','Manage documents')}{link('job','Cancel',jobParams)}</div></Form>:<Empty title="Applications are closed" detail="Choose a published opening.">{link('jobs','Browse jobs')}</Empty>
      case 'applyreview':return panel('Review before submitting',<><h3>{job?.title}</h3><p>{data.profile.name} · {data.profile.headline}</p><p>{data.profile.summary}</p><p>Résumé: {draft?.document||'No attachment'}</p><p>{draft?.answer||'No screening answer'}</p><div className="pv-actions">{act('Submit application',submitApplication,true)}{link('apply','Edit answers',jobParams)}{link('job','Cancel',jobParams)}</div></>)
      case 'receipt':return panel('Application received',<><p>Your application was added to the sample hiring pipeline. Check your timeline as the hiring team reviews it.</p><div className="pv-actions">{link('app','View application',contextual,'pv-button primary')}{link('coaching','View coaching',contextual)}{link('jobs','Browse more jobs')}</div></>)
      case 'apps':return applications()
      case 'app':return application&&application.source!=='Batch'?panel(currentJob(application)?.title??'Application',<><Pill>{application.status}</Pill><ol className="pv-timeline">{application.events.map((s,i)=><li key={i}>{s}</li>)}</ol>{data.scheduled[application.id]&&<p>Interview · {data.scheduled[application.id]}</p>}<h3>Submitted information</h3><p>{application.name} · {application.headline}</p><p>{application.summary}</p><p>{application.answer}</p><p>{application.document}</p><div className="pv-actions">{active(application)&&link('withdraw','Withdraw application',contextual)}{link('coaching','View coaching',contextual)}{link('updates','View updates')}{link('apps','Back to applications')}</div></>):<Empty title="Application unavailable" detail="Select one of your own applications.">{link('apps','My applications')}</Empty>
      case 'withdraw':return application&&application.source!=='Batch'&&active(application)?panel('Withdraw this application?',<><p>The application stays in your history and the hiring team will see that you withdrew.</p><div className="pv-actions">{act('Confirm withdrawal',()=>{changeStage(application,'Withdrawn');go('app',contextual)},true)}{link('app','Cancel',contextual)}</div></>):link('apps','Back to applications')
      case 'updates':return role==='candidate'?panel('Application updates',<><div className="pv-actions">{act('Mark all as read',()=>mutate(p=>({...p,updates:p.updates.map(n=>({...n,read:true}))})))}{link('updates','All')}{link('updates','Unread',{read:'no'})}{link('updates','Read',{read:'yes'})}</div>
        {data.updates.filter(n=>!params.read||(params.read==='yes')===n.read).length?<ul className="pv-list">{data.updates.filter(n=>!params.read||(params.read==='yes')===n.read).map(n=><li key={n.id}><span>{n.message} {!n.read&&<Pill>Unread</Pill>}</span><div className="pv-actions">{!n.read&&act('Mark read',()=>mutate(p=>({...p,updates:p.updates.map(e=>e.id===n.id?{...e,read:true}:e)})))}{link('app','Open application',{application:n.application})}</div></li>)}</ul>:<Empty title="No updates match" detail="New status updates appear after an application changes."/>}</>):panel('Hiring activity',<ul className="pv-list">{data.audit.map((message,i)=><li key={i}>{message}</li>)}</ul>)
      case 'data':return panel('Your information',<><p>Export your sample profile and application history. A deletion request goes to the review queue.</p><div className="pv-actions">{act('Download my data',()=>download('candidate-preview.json',JSON.stringify({profile:data.profile,documents:data.documents,applications:data.applications.filter(a=>a.source!=='Batch').map(a=>({id:a.id,job:a.job,name:a.name,status:a.status,document:a.document,headline:a.headline,summary:a.summary,answer:a.answer,events:a.events}))},null,2),'application/json'))}{link('dataconfirm','Request deletion review')}</div>{data.requests.map((r,i)=><p key={i}>{r.name} · {r.status}</p>)}</>)
      case 'dataconfirm':return panel('Send a deletion review request?',<><p>Your sample hiring records remain available while the request is pending.</p><div className="pv-actions">{act('Submit request',()=>{if(data.requests.some(r=>r.status==='Pending'))return notify('You already have a pending request.',true);mutate(p=>({...p,requests:[...p.requests,{name:'Candidate data request',status:'Pending'}]}),'Data review requested');go('data')},true)}{link('data','Cancel')}</div></>)
      case 'rjobs':return <><div className="pv-actions">{link('jobedit','Create job',undefined,'pv-button primary')}{link('jobimport','Import job specification')}</div>{jobCards(data.jobs,'rjob')}</>
      case 'jobedit':{const j=params.job?job:undefined;return <Form label="Save draft" submit={saveJob}><div className="pv-grid fields">
        <Field name="title" label="Job title" value={jobDraft?.title??j?.title} required/><Field name="team" label="Team" value={j?.team} required/><Field name="location" label="Location" value={j?.location} required/><Field name="work" label="Work arrangement" options={['Hybrid','Remote','On site']} value={j?.work}/><Field name="salary" label="Compensation" value={j?.salary}/><Field name="question" label="Screening question" value={j?.question}/></div>
        <Field name="description" label="Role description" value={jobDraft?.description??j?.description} area required/><Field name="criteria" label="Review criteria · one per line" value={j?.criteria.join('\n')} area required/>
        <div className="pv-actions">{link('aidraft','Suggest description',params.job?{job:params.job}:undefined)}{link('rjobs','Cancel')}</div></Form>}
      case 'rjob':return job?panel(job.title,<><Pill>{job.state}</Pill><p>{job.description}</p><p>{job.criteria.join(' · ')}</p>
        <div className="pv-actions">{job.state==='Draft'&&link('jobedit','Edit draft',jobParams)}{
          ({Draft:[['Publish','Published']],Published:[['Pause','Paused'],['Close','Closed']],Paused:[['Resume','Published'],['Close','Closed']],Closed:[['Archive','Archived']],Archived:[]}[job.state]).map(([label,state])=><Link key={state} className="pv-button" go={go} id="jobconfirm" params={{job:job.id,state}}>{label}</Link>)}
          {job.state==='Published'&&link('job','View public listing',jobParams)}{link('pipeline','View applicants',jobParams)}{link('funnel','Hiring report',jobParams)}{link('rjobs','Back to jobs')}</div></>):link('rjobs','Back to jobs')
      case 'jobconfirm':return panel('Confirm status change',<><p>{job?.title} · {job?.state} → {params.state||'Choose a status'}</p><div className="pv-actions">{act('Confirm change',jobStatus,true)}{link('rjob','Cancel',jobParams)}</div></>)
      case 'pipeline':return applications(true)
      case 'review':return application?panel(application.name,<><Pill>{application.status}</Pill><p>{application.headline} · {currentJob(application)?.title}</p><p>{application.summary}</p><p>{application.answer}</p>
        {application.document&&act('Download sample résumé',()=>download('sample-resume.txt','Fictional résumé · '+application.document))}
        <ol className="pv-timeline">{application.events.map((event,i)=><li key={i}>{event}</li>)}</ol>
        {application.reason&&<p>Private decision reason: {application.reason}</p>}
        <h3>Criterion assessments</h3><ul>{Object.entries(application.reviews).map(([criterion,rating])=><li key={criterion}>{criterion}: {rating}</li>)}</ul>
        {active(application)&&<Form label="Record assessment" submit={f=>{const criterion=value(f,'criterion');if(!criterion)return notify('Select a criterion first.',true);mutate(p=>({...p,applications:p.applications.map(a=>a.id===application.id?{...a,reviews:{...a.reviews,[criterion]:value(f,'rating')+' · '+value(f,'note')}}:a)}),'Criterion assessment recorded');notify('Assessment saved.')}}><div className="pv-grid fields"><Field name="criterion" label="Criterion" options={currentJob(application)?.criteria??[]}/><Field name="rating" label="Assessment" options={['Meets','Partially meets','Does not meet']}/></div><Field name="note" label="Evidence note" area required/></Form>}
        <div className="pv-actions">{active(application)&&link('stage','Move stage',contextual)}{active(application)&&link('interview','Schedule interview',contextual)}{active(application)&&link('decision','Record decision',contextual)}{link('pipeline','Back to pipeline',jobParams)}</div></>):<Empty title="No application selected" detail="Choose a candidate from the pipeline.">{link('pipeline','Applicant pipeline')}</Empty>
      case 'stage':{const next=application?({Submitted:'In review','In review':'Interview',Interview:'Offer'} as Partial<Record<Stage,Stage>>)[application.status]:undefined;return panel('Move application stage',<><p>{application?.name} · {application?.status} {next?'→ '+next:'· no further intermediate stage'}</p><div className="pv-actions">{application&&next&&act('Confirm move',()=>{changeStage(application,next);go('review',contextual)},true)}{link('review','Back to review',contextual)}</div></>)}
      case 'interview':return application&&active(application)?<Form label="Save sample invitation" submit={f=>{mutate(p=>({...p,scheduled:{...p.scheduled,[application.id]:value(f,'datetime')+' · '+value(f,'zone')+' · '+value(f,'location')}}),'Interview scheduled');go('review',contextual)}}><div className="pv-grid fields"><Field name="datetime" label="Interview date and time" type="datetime-local" required/><Field name="zone" label="Time zone" value="Asia/Kolkata" required/><Field name="location" label="Sample meeting link or location" required/></div><Field name="message" label="Candidate message" area/>{link('review','Cancel',contextual)}</Form>:link('review','Back to review',contextual)
      case 'decision':return application&&active(application)?<Form label="Record decision" submit={f=>{const target=value(f,'outcome') as Stage;if(application.status==='Submitted'||(target==='Hired'&&application.status!=='Offer'))return notify('Advance the application to the appropriate stage first.',true)
        if(!currentJob(application)?.criteria.every(c=>application.reviews[c]))return notify('Record an assessment for every criterion first.',true)
        changeStage(application,target,value(f,'reason'));go('review',contextual)}}><p>The candidate receives the outcome. This reason stays with the hiring team.</p><Field name="outcome" label="Outcome" options={['Not selected','Hired']}/><Field name="reason" label="Private reason" area required/>{link('review','Cancel',contextual)}</Form>:link('review','Back to review',contextual)
      case 'org':return <Form label="Create sample organization" submit={f=>{mutate(p=>({...p,organization:value(f,'name')}),'Organization updated');go('adash')}}><p>Current workspace: {data.organization}</p><Field name="name" label="Organization name" required/><Field name="slug" label="URL slug" required/>{link('invite','Accept invitation')}</Form>
      case 'members':return <><div className="pv-actions">{link('memberinvite','Invite a member',undefined,'pv-button primary')}{link('org','Manage organization')}</div><Rows headers={['Email','Role','Status','Action']} rows={data.members.map(m=>({key:m.email,cells:[m.email,m.role,<Pill key="status">{m.status}</Pill>,m.role==='Admin'||m.status==='Revoked'?'—':link('revoke','Revoke access',{email:m.email})]}))}/></>
      case 'memberinvite':return <Form label="Send sample invitation" submit={f=>{const email=value(f,'email').toLowerCase();if(data.members.some(m=>m.email===email&&m.status!=='Revoked'))return notify('This email already has workspace access or a pending invitation.',true);mutate(p=>({...p,members:[...p.members.filter(m=>m.email!==email),{email,role:value(f,'role'),status:'Invited'}]}),'Team invitation created');go('members')}}><Field name="email" label="Work email" type="email" required/><Field name="role" label="Role" options={['Recruiter','Admin']}/>{link('members','Cancel')}</Form>
      case 'revoke':return panel('Confirm access removal',<><p>{params.email||'Select a team member first.'}</p><div className="pv-actions">{params.email&&act('Revoke access',()=>{mutate(p=>({...p,members:p.members.map(m=>m.email===params.email&&m.role!=='Admin'?{...m,status:'Revoked'}:m)}),'Team access revoked');go('members')},true)}{link('members','Cancel')}</div></>)
      case 'policy':return <Form label="Save policy" submit={f=>{mutate(p=>({...p,policy:{waiting:value(f,'waiting'),retention:value(f,'retention'),ai:value(f,'ai')==='Allowed',wording:value(f,'wording')}}),'Organization policy updated');notify('Sample policy saved.')}}>
        <div className="pv-grid fields"><Field name="waiting" label="Days before reapplying" type="number" min={0} max={365} value={data.policy.waiting} required/><Field name="retention" label="Retention review period (days)" type="number" min={30} max={3650} value={data.policy.retention} required/><Field name="ai" label="AI assistance" options={['Disabled','Allowed']} value={data.policy.ai?'Allowed':'Disabled'}/><Field name="wording" label="Candidate status wording" value={data.policy.wording}/></div>{link('audit','Review audit')}</Form>
      case 'audit':return panel('Recorded preview actions',<><Form label="Filter audit" submit={f=>go('audit',{q:value(f,'q')})}><Field name="q" label="Find an action" value={params.q}/></Form><ul className="pv-list">{data.audit.filter(s=>!params.q||s.toLowerCase().includes(params.q.toLowerCase())).map((s,i)=><li key={i}>{s}</li>)}</ul>{act('Export audit',()=>download('preview-audit.txt',data.audit.join('\n')))}</>)
      default:return supplemental(screen)
    }
  }

  function supplemental(s:Screen):ReactNode {
    switch(s.id) {
      case 'how':return <div className="pv-grid stats">{[
        ['Candidate','Find a job, build your profile and track every application.','jobs'],
        ['Recruiter','Publish openings, review candidates and record decisions.','access'],
        ['Admin','Manage who has access and how your team handles hiring records.','login'],
      ].map(([title,detail,target])=><section key={title} className="pv-card"><h2>{title}</h2><p>{detail}</p>{link(target,'See '+title.toLowerCase()+' experience')}</section>)}</div>
      case 'account':return panel('Choose a sample workspace',<><p>Switch roles to follow the same application from both sides.</p><div className="pv-actions">{(Object.keys(dashboards) as Role[]).map(r=><button key={r} className="pv-button" onClick={()=>switchRole(r)}>Switch to {roleLabel[r]}</button>)}{role&&act('Sign out',signOut)}{role==='admin'&&link('org','Manage organizations')}</div></>)
      case 'forgot': return <Form label="Request sample reset link" submit={()=>notify('A reset message would be sent if the account exists. Use the sample link to continue.')}><Field name="email" label="Registered email" type="email" required/><div className="pv-actions">{link('reset','Open sample reset link')}{link('login','Back to sign in')}</div></Form>
      case 'reset': return <Form label="Save sample password" submit={f=>value(f,'pass')===value(f,'confirm')?go('login'):notify('The passwords do not match.',true)}><Field name="pass" label="New sample password" type="password" min={12} required/><Field name="confirm" label="Confirm sample password" type="password" required/>{link('forgot','Request new link')}</Form>
      case 'access':return <Form label="Request sample verification link" submit={()=>{mutate(p=>({...p,verification:'Link requested'}));go('otp')}}><Field name="name" label="Full name" required/><Field name="email" label="Work email" type="email" required/><Field name="company" label="Company" required/>{link('otp','Continue with sample link')}</Form>
      case 'otp':return <Form label="Verify and continue" submit={f=>{const file=f.get('proof');if(value(f,'code')!=='123456')return notify('Enter sample code 123456.',true);if(!(file instanceof File)||!/\.(pdf|docx|txt)$/i.test(file.name))return notify('Choose a sample PDF, DOCX, or TXT document.',true);go('company')}}><p>Sample invitation code: <strong>123456</strong>. Choose a fictional verification document.</p><Field name="code" label="Verification code" required/><Field name="proof" label="Corporate verification document" type="file" required/>{link('access','Request a link')}</Form>
      case 'company':return <Form label="Review request" submit={()=>go('onreview')}><div className="pv-grid fields"><Field name="company" label="Company name" required/><Field name="site" label="Company website" type="url" required/><Field name="role" label="Designation" required/><Field name="phone" label="Contact phone" type="tel" required/><Field name="disciplines" label="Hiring disciplines"/></div>{link('otp','Previous')}</Form>
      case 'onreview':return panel('Corporate verification',<><p>Status: {data.verification}</p><div className="pv-actions">{act('Submit for approval',()=>{mutate(p=>({...p,verification:'Under review'}),'Recruiter verification submitted');notify('Sample request is ready for Admin review.')},true)}{link('company','Edit details')}{link('home','Return home')}</div></>)
      case 'invite':return panel('Organization invitation',<><p>Join {data.organization} as a recruiter using the sample invitation.</p>{act('Accept sample invitation',()=>switchRole('recruiter'),true)}{link('login','Switch account')}</>)
      case 'profilelegacy':return <Form label="Review extended profile" submit={f=>{mutate(p=>({...p,profile:{...p.profile,education:[value(f,'degree'),value(f,'study'),value(f,'school'),value(f,'year')].filter(Boolean).join(' · '),experience:[value(f,'experience'),value(f,'title'),value(f,'company')].filter(Boolean).join(' · '),skills:value(f,'skills'),portfolio:value(f,'portfolio')}}));go('profilelegacyreview')}}><div className="pv-grid fields"><Field name="degree" label="Highest degree" required/><Field name="study" label="Field of study" required/><Field name="school" label="University or institution"/><Field name="year" label="Graduation year" type="number" min={1900}/><Field name="experience" label="Years of experience" type="number" min={0}/><Field name="title" label="Current or recent title"/><Field name="company" label="Current or recent employer"/><Field name="skills" label="Skills"/><Field name="portfolio" label="Portfolio URL" type="url"/></div>{link('register','Previous')}</Form>
      case 'profilelegacyreview':return panel('Extended profile summary',<><p>{data.profile.education}</p><p>{data.profile.experience}</p><p>{data.profile.skills}</p><div className="pv-actions">{link('profilelegacy','Edit details')}{link('verify','Complete registration',undefined,'pv-button primary')}</div></>)
      case 'coaching':return application&&application.source!=='Batch'?panel('Private coaching preview',<><Pill>Example guidance</Pill><p>Prepare a specific example for each requirement in {currentJob(application)?.title??'this role'}.</p><blockquote>{application.answer}</blockquote><ul>{currentJob(application)?.criteria.map(c=><li key={c}>Prepare an example of {c.toLowerCase()} and describe the result.</li>)}</ul>{link('apps','Back to applications')}</>):<Empty title="No application selected" detail="Open a submitted application to preview coaching.">{link('apps','Choose application')}</Empty>
      case 'aidraft':return <Form label="Create sample draft" submit={f=>{setJobDraft({title:value(f,'title'),description:'About the role\n\n'+value(f,'facts')});go('jobedit',params.job?{job:params.job}:undefined)}}><p>This preview formats your sample facts into an editable draft. No external model is called.</p><Field name="title" label="Role title" value={params.job?job?.title:''} required/><Field name="facts" label="Facts to include" area required/>{link('jobedit','Back to editor',params.job?{job:params.job}:undefined)}</Form>
      case 'jobimport':return <Form label="Preview imported draft" submit={f=>{const file=f.get('file');if(!(file instanceof File)||!file.name)return notify('Choose a sample document.',true);setJobDraft({title:file.name.replace(/\.[^.]+$/,''),description:'Sample extracted job description. Replace this with the verified role details.'});go('jobedit')}}><p>This preview uses the filename to start a draft. It does not parse the file.</p><Field name="file" label="Sample job specification" type="file" required/>{link('rjobs','Cancel')}</Form>
      case 'batch':return <><Form label="Add to screening queue" submit={f=>{const files=f.getAll('files').filter((file):file is File=>file instanceof File&&!!file.name);if(!files.length||files.some(file=>!/\.(pdf|docx|txt)$/i.test(file.name)))return notify('Choose sample PDF, DOCX or TXT files.',true);mutate(p=>({...p,uploaded:[...new Set([...p.uploaded,...files.map(file=>file.name)])]}));notify('Files added to the sample queue.')}}><label className="pv-field">Sample résumé files<input type="file" name="files" multiple required accept=".pdf,.docx,.txt"/></label></Form>
        <Form label="Run sample screening" submit={f=>{const target=value(f,'job');const j=data.jobs.find(item=>item.title===target);if(!j||!data.uploaded.length)return notify('Select a job and add files first.',true);const batch:Application[]=data.uploaded.map(file=>({id:newId(),job:j.id,name:file.replace(/\.[^.]+$/,'').replaceAll('-',' '),status:'Submitted',answer:'Imported sample application',document:file,headline:'Batch applicant',summary:'Sample résumé metadata',events:['Submitted'],reviews:{},source:'Batch'}));mutate(p=>({...p,applications:[...batch,...p.applications.filter(a=>a.job!==j.id||!p.uploaded.includes(a.document)||a.source!=='Batch')],uploaded:[]}),'Sample batch screening completed');go('results',{job:j.id})}}>
          <Field name="job" label="Target job" options={data.jobs.filter(j=>j.state!=='Archived').map(j=>j.title)}/><ul className="pv-list">{data.uploaded.map(file=><li key={file}>{file}{act('Remove',()=>mutate(p=>({...p,uploaded:p.uploaded.filter(n=>n!==file)})))}</li>)}</ul><div className="pv-actions">{data.uploaded.length>0&&act('Clear all',()=>mutate(p=>({...p,uploaded:[]})))}{link('results','View results')}</div></Form></>
      case 'results': {const batch=data.applications.filter(a=>a.source==='Batch'&&(!params.job||a.job===params.job));return panel('Batch screening results',<>{batch.length?<Rows headers={['Candidate','Job','Stage','Review']} rows={batch.map(a=>({key:a.id,cells:[a.name,currentJob(a)?.title,a.status,link('review','Review application',{job:a.job,application:a.id})]}))}/>:<Empty title="No batch results" detail="Run sample screening to populate this view."/>}{link('batch','Back to batch upload')}</>)}
      case 'funnel':return panel('Applications by current stage',<><Field name="job" label="Job scope" value={params.job?job?.title:'All jobs'} options={params.job?[job?.title??'All jobs']:['All jobs']}/><div className="pv-chart">{stages.map(s=>{const count=data.applications.filter(a=>a.status===s&&(!params.job||a.job===params.job)).length;return <div key={s}><span>{s}</span><meter min={0} max={Math.max(data.applications.length,1)} value={count} aria-label={s}/><strong>{count}</strong></div>})}</div><div className="pv-actions">{act('Export report',()=>download('sample-hiring-report.csv','Stage,Count\n'+stages.map(s=>s+','+data.applications.filter(a=>a.status===s&&(!params.job||a.job===params.job)).length).join('\n'),'text/csv'))}{link('pipeline','Open applicants',params.job?jobParams:undefined)}</div></>)
      case 'requests':return panel('Recruiter verification queue',<><p>Sample request · {data.verification}</p>{link('request','Inspect request')}</>)
      case 'request':return panel('Verification request',<><p>Sample recruiter · {data.organization} · {data.verification}</p><div className="pv-actions">{act('Download sample document',()=>download('sample-verification.txt','Fictional corporate verification document'))}{['Approve','Reject','Resend link','Delete request'].map((a,i)=><button key={a} className="pv-button" onClick={()=>{mutate(p=>({...p,verification:['Approved','Rejected','Link requested','No request submitted'][i]}),'Recruiter request: '+a);go('requests')}}>{a}</button>)}{link('requests','Back')}</div></>)
      case 'directory':return panel('Candidate directory',<Rows headers={['Candidate','Job','Status']} rows={data.applications.map(a=>({key:a.id,cells:[a.name,currentJob(a)?.title,a.status]}))}/>)
      case 'recruiters':case 'users':return panel('Workspace accounts',<>{link('memberinvite','Provision sample recruiter')}<Rows headers={['Email','Role','Status','Action']} rows={data.members.map(m=>({key:m.email,cells:[m.email,m.role,m.status,m.role!=='Admin'?link('useredit','Manage account',{email:m.email}):'—']}))}/></>)
      case 'useredit':return <Form label="Save account changes" submit={f=>{mutate(p=>({...p,members:p.members.map(m=>m.email===params.email?{...m,role:value(f,'role'),status:value(f,'status')}:m)}),'Sample account updated');go('users')}}><p>{params.email||'Select an account from the directory.'}</p><Field name="role" label="Role" options={['Recruiter','Admin']}/><Field name="status" label="Access" options={['Active','Revoked']}/>{link('users','Cancel')}</Form>
      case 'requestsdata':return panel('Candidate data requests',data.requests.length?<ul className="pv-list">{data.requests.map((r,i)=><li key={i}>{r.name} · {r.status}{r.status==='Pending'&&<div className="pv-actions">{['Completed','Rejected'].map(status=><button className="pv-button" key={status} onClick={()=>mutate(p=>({...p,requests:p.requests.map((v,index)=>index===i?{...v,status}:v)}),'Data request '+status.toLowerCase())}>{status==='Completed'?'Complete sample review':'Reject sample request'}</button>)}</div>}</li>)}</ul>:<Empty title="No data requests" detail="Submit a sample request from Candidate → Privacy & data."/>)
      case 'delivery':return panel('Sample delivery activity',<><p>{data.delivery}</p><div className="pv-actions">{act('Simulate failed delivery',()=>mutate(p=>({...p,delivery:'Sample email failed · Retry available'}),'Simulated delivery failure'))}{act('Retry delivery',()=>mutate(p=>({...p,delivery:'Sample retry delivered'}),'Simulated delivery retry'))}{link('audit','Open audit')}</div></>)
      case 'migration':return <Form label="Run sample preflight" submit={f=>{const file=f.get('file');if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.csv'))return notify('Choose a sample CSV export.',true);mutate(p=>({...p,preflight:'Sample run recorded · '+file.name}),'Migration preview preflight recorded');notify('Sample run recorded. Use the repository CLI to check a real export.')}}><p>{data.preflight}</p><Field name="file" label="Fictional legacy CSV export" type="file" required/>{act('Download sample reconciliation',()=>download('sample-reconciliation.txt',data.preflight))}{link('audit','Open audit')}</Form>
      case 'assistant':return <Form label="Ask preview assistant" submit={f=>notify('Sample answer: '+(value(f,'question').toLowerCase().includes('job')?'Browse open roles on Find jobs.':'Go to Applications to review your progress, or ask the hiring team for details.'))}><p>Try a sample question about jobs or applications.</p><Field name="question" label="Your question" area required/>{link('jobs','Find jobs')}{link('home','Close assistant')}</Form>
      case 'privacy':return panel('Privacy in this preview',<><p>Sample profile data and workflow changes are stored in this browser. Files stay on your device and the preview stores their names only.</p><p>Use the candidate workspace for an example export or deletion review.</p><div className="pv-actions">{link('data','Candidate data controls')}{link('help','Contact help')}</div></>)
      case 'help':return <Form label="Preview support request" submit={()=>notify('This is a sample request preview. Nothing was sent.')}><p>Use the sample support form to review the interaction.</p><Field name="subject" label="Subject" required/><Field name="message" label="Message" area required/>{link('forgot','Reset password')}</Form>
      case 'states':return <Empty title="Page unavailable" detail="Check the address, or return to a workspace or the public site.">{link('home','Go home')}{link('help','Get help')}</Empty>
      case 'operations':return panel('Preview status',<><p>The browser preview is ready. Use the connected app to check its API and database.</p><a className="pv-button" href="/connected">Open connected app</a></>)
      case 'mobile':return panel('Responsive workspace',<><p>Resize the browser or open this preview on a phone. The workspace menu remains available above the content.</p>{link('account','Choose workspace')}</>)
      default:return <Empty title="Preview unavailable" detail="Open the screen directory to choose a different view."/>
    }
  }

  const denied=required!==null && required!==role && !(required==='recruiter'&&role==='admin')
  return <div className={'pv-app'+(inWorkspace?' workspace':'')}>
    <a href="#preview-content" className="pv-skip" onClick={e=>{e.preventDefault();document.getElementById('preview-content')?.focus()}}>Skip to content</a>
    <header className="pv-header"><div className="pv-top">
      <Link go={go} id="home" className="pv-brand"><span className="pv-mark">A<span>.</span></span><span>AI Resume Analyser</span></Link>
      <nav aria-label="Top navigation">
        <a className="pv-top-link" href="/#how-it-works">How it works</a>
        {id==='home'?<><a href="/connected" className="pv-button">Sign in</a><a href="/connected?mode=register" className="pv-button primary">Create account</a></>:
          role?link('account',roleLabel[role]+' workspace',undefined,'pv-button'):link('login','Try a sample sign-in',undefined,'pv-button')}
      </nav>
    </div></header>
    <div className="pv-body">
      {inWorkspace&&role&&<aside className="pv-sidebar"><div className="pv-org"><span className="pv-symbol">{data.organization.slice(0,2).toUpperCase()}</span><div><strong>{data.organization}</strong><small>{roleLabel[role]} workspace</small></div></div>
        <nav aria-label={roleLabel[role]+' navigation'}>{nav[role].map(([target,label])=><Link key={target} go={go} id={target} current={id===target} className="pv-nav-item">{label}{target==='updates'&&role==='candidate'&&unread>0&&<span>{unread}</span>}</Link>)}</nav>
        <div className="pv-sidebar-bottom">{link('account','Switch workspace',undefined,'pv-nav-item')}<button type="button" className="pv-nav-item" onClick={signOut}>Sign out</button></div>
      </aside>}
      <main id="preview-content" tabIndex={-1} className={id==='home'?'pv-main pv-home':'pv-main'} key={id+JSON.stringify(params)}>
        {id!=='home'&&<div className="pv-page-heading"><p className="pv-kicker">{screen.area==='Public'?'AI RESUME ANALYSER':screen.area.toUpperCase()+' WORKSPACE'}</p><h1>{screen.title}</h1><p>{screen.desc}</p></div>}
        {feedback&&<div className={'pv-feedback'+(feedback.error?' error':'')} role={feedback.error?'alert':'status'}>{feedback.text}</div>}
        {denied?<Empty title={role?'Switch workspace to continue':'Sign in to continue'} detail={'This screen belongs to the '+roleLabel[required]+' workspace.'}>{act('Continue as '+roleLabel[required],()=>switchRole(required),true)}{link('login','Sign in options')}</Empty>:core()}
      </main>
    </div>
    <footer className="pv-footer"><span>Interactive preview · Sample data</span><nav aria-label="Footer">{link('privacy','Privacy',undefined,'pv-top-link')}{link('help','Help',undefined,'pv-top-link')}{link('assistant','Assistant',undefined,'pv-top-link')}<details><summary>Screen directory</summary><div className="pv-directory">{screens.map(s=><Link key={s.id} go={go} id={s.id}>{s.title}</Link>)}</div></details><a href="/connected">Open live workspace</a></nav></footer>
  </div>
}
const audiences = [
  {
    role: 'For candidates', title: 'Know where you stand',
    description: 'Find roles that fit, apply with a reusable profile, and see what happens after you submit.',
    features: ['Browse jobs by role, location, or work arrangement', 'Manage your profile and résumé in one place', 'See status updates, interview details, and decisions'],
    target: 'jobs', action: 'Browse open roles',
  },
  {
    role: 'For recruiters', title: 'Run a structured hiring process',
    description: 'Give your team one place to publish openings, review applicants, and share updates.',
    features: ['Publish jobs with screening questions and review criteria', 'Assess applicants against the same criteria', 'Schedule interviews and record decisions'],
    target: 'access', action: 'Request recruiter access',
  },
  {
    role: 'For admins', title: 'Manage hiring access and policies',
    description: 'Set up your organization, give teammates the right access, and track changes.',
    features: ['Invite team members and revoke access when needed', 'Set reapplication, retention, and AI policies', 'Review audit activity and candidate data requests'],
    target: 'adash', action: 'Explore admin workspace',
  },
] as const

function Home({go}:{go:Navigate}) {
  useEffect(()=>{
    if (location.hash==='#how-it-works') document.getElementById('how-it-works')?.scrollIntoView()
  }, [])

  return <>
    <section className="pv-hero" aria-labelledby="landing-title">
      <p className="pv-kicker">THE HIRING WORKSPACE</p>
      <h1 id="landing-title">Find your next role.<br/>Build your next team.</h1>
      <p className="pv-hero-intro">Follow an application from the first job post to the final decision. Candidates see their progress, recruiters have a clear process for review, and admins control how their team works.</p>
      <div className="pv-actions pv-hero-actions">
        <Link go={go} id="jobs" className="pv-button primary">Explore open roles <span className="pv-link-arrow" aria-hidden="true"/></Link>
        <Link go={go} id="access" className="pv-button">I’m hiring</Link>
        <Link go={go} id="adash" className="pv-button">I manage a team</Link>
      </div>
    </section>

    <section className="pv-home-section" aria-labelledby="workspaces-title">
      <h2 id="workspaces-title">What you can do in each workspace</h2>
      <div className="pv-home-grid">{audiences.map(audience=><article className="pv-card pv-role-card" key={audience.role}>
        <p className="pv-kicker">{audience.role}</p>
        <h3>{audience.title}</h3>
        <p>{audience.description}</p>
        <ul>{audience.features.map(feature=><li key={feature}>{feature}</li>)}</ul>
        <Link go={go} id={audience.target} className="pv-button">{audience.action} <span className="pv-link-arrow" aria-hidden="true"/></Link>
      </article>)}</div>
    </section>

    <section id="how-it-works" className="pv-home-section pv-journey" aria-labelledby="journey-title" tabIndex={-1}>
      <h2 id="journey-title">How hiring works</h2>
      <ol className="pv-home-grid">
        <li><h3>Set up and publish</h3><p>Admins invite the hiring team. Recruiters define the job, screening questions, and criteria before publishing.</p></li>
        <li><h3>Apply and review</h3><p>Candidates submit their profile, résumé, and answers. Recruiters review the submission and record an assessment for each criterion.</p></li>
        <li><h3>Share the next step</h3><p>Recruiters move applications through review and interviews. Candidates see the status, next steps, and final outcome in their timeline.</p></li>
      </ol>
    </section>

    <section className="pv-home-section pv-home-faq" aria-labelledby="platform-faq">
      <h2 id="platform-faq">Good to know before you start</h2>
      <details><summary>Where does AI fit in?</summary><p>AI can help draft job descriptions and offer coaching suggestions. The hiring team reviews the evidence and makes the decision.</p></details>
      <details><summary>Who can see my application?</summary><p>Candidates can see their own applications and updates. Hiring teams can review submissions for their jobs. Internal assessments and decision notes stay in the hiring workspace.</p></details>
      <details><summary>How do I get access?</summary><p>Candidates can create an account. Recruiters can request access or accept an organization invitation, and admins can open their organization’s workspace after signing in.</p></details>
      <details><summary>Can I try the platform before using real data?</summary><p>Yes. Choose a sample role on the sign-in screen to try the workflows with fictional data. Preview activity stays in this browser.</p></details>
      <div className="pv-actions">
        <Link go={go} id="login" className="pv-button primary">Try a workspace</Link>
        <Link go={go} id="privacy" className="pv-button">Read the privacy information</Link>
      </div>
    </section>
  </>
}
