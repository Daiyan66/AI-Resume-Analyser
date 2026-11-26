import type { Member } from './api'

export function RecruiterFilter({ members, value }: { members: Member[] | undefined; value: string }) {
  return <label>Recruiter<select name="recruiter" aria-label="Recruiter" key={members ? 'ready' : 'loading'} defaultValue={value}>
    <option value="">All posting team members</option>
    {value && !members?.some(member => member.id === value) && <option value={value}>Selected team member</option>}
    {members?.map(member => <option key={member.id} value={member.id}>
      {member.displayName} · {member.role === 'ADMIN' ? 'Admin' : 'Recruiter'}{member.status === 'REVOKED' ? ' (former member)' : ''}
    </option>)}
  </select></label>
}
