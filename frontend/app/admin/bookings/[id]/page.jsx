'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';
import chatSocketService from '@/lib/services/chatSocketService';

function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleString(); } catch { return String(d); } }
function fmtDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const [pms, setPms] = useState([]);
  const [resources, setResources] = useState([]);
  const [pickPm, setPickPm] = useState('');
  const [pickRes, setPickRes] = useState('');

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await staffApi.get(`/admin/bookings/${id}`);
      setJob(r.data?.data || null);
    } catch (e) { setError(e); }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await staffApi.get(`/admin/bookings/${id}/messages`);
      setMessages(r.data?.data || []);
    } catch {}
  }, [id]);

  const loadPickers = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        staffApi.get('/admin/pms-list'),
        staffApi.get('/admin/resources-list'),
      ]);
      setPms(a.data?.data || []);
      setResources(b.data?.data || []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadMessages(); loadPickers(); }, [load, loadMessages, loadPickers]);

  // Real-time chat via socket + 10s polling fallback
  useEffect(() => {
    const sock = chatSocketService.socket;
    const onMessage = (msg) => {
      if (!msg) return;
      setMessages(prev => {
        const exists = prev.some(m => String(m._id) === String(msg._id || msg.id));
        return exists ? prev : [...prev, msg];
      });
    };
    if (sock) {
      sock.on('new-message', onMessage);
      sock.on('new_message', onMessage);
      sock.on('message', onMessage);
    }
    pollRef.current = setInterval(loadMessages, 10000);
    return () => {
      if (sock) {
        sock.off('new-message', onMessage);
        sock.off('new_message', onMessage);
        sock.off('message', onMessage);
      }
      clearInterval(pollRef.current);
    };
  }, [loadMessages]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const confirm = async () => {
    setBusy('confirm');
    try { await staffApi.post(`/admin/bookings/${id}/confirm`); await load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(null); }
  };
  const reject = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    const reason = window.prompt('Reason for cancellation:') || '';
    setBusy('reject');
    try { await staffApi.patch(`/admin/bookings/${id}/reject`, { reason }); await load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(null); }
  };
  const assignPm = async () => {
    if (!pickPm) return;
    setBusy('pm');
    try { await staffApi.post(`/admin/bookings/${id}/assign-pm`, { pmId: pickPm }); setPickPm(''); await load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(null); }
  };
  const assignRes = async () => {
    if (!pickRes) return;
    setBusy('res');
    try { await staffApi.post(`/admin/bookings/${id}/assign-resource`, { resourceId: pickRes }); setPickRes(''); await load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(null); }
  };
  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await staffApi.post(`/admin/bookings/${id}/messages`, { msg: text });
      setMessages((arr) => [...arr, r.data?.data]);
      setDraft('');
    } catch (e) { alert(e?.response?.data?.error?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  if (error) return <div className="p-6"><ErrorBox error={error} /></div>;
  if (!job) return <div className="p-6"><Spinner /></div>;
  const svc = job.services?.[0] || {};

  return (
    <div>
      <PageHeader
        title={`Booking ${String(job._id).slice(-8)}`}
        subtitle="Full booking control — assign, monitor, chat, cancel"
        action={<Button variant="subtle" size="sm" onClick={() => router.push('/admin/bookings')}>← Back</Button>}
      />
      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Status</h3>
              <StatusBadge status={job.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Field label="Customer" value={job.customerName} sub={job.customerMobile} />
              <Field label="Service" value={job.serviceName} />
              <Field label="Amount" value={`₹${job.amount || 0}`} />
              <Field label="Date" value={svc.preferredStartDate ? new Date(svc.preferredStartDate).toLocaleDateString() : '—'} />
              <Field label="Start" value={svc.startTime || '—'} />
              <Field label="End" value={svc.endTime || '—'} />
              <Field label="Duration" value={`${svc.durationTime || 0}h`} />
              <Field label="Worked" value={fmtDuration(job.workedMs || 0)} mono />
              <Field label="Created" value={fmtDate(job.createdAt)} />
              <Field label="Started" value={fmtDate(job.startedAt)} />
              <Field label="Completed" value={fmtDate(job.completedAt)} />
              <Field label="Booking ID" value={String(job._id)} mono />
            </div>
            {svc.requirements && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold mb-1">Requirements</div>
                <div className="text-sm text-[#26472B] whitespace-pre-wrap">{svc.requirements}</div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap mt-5 border-t border-[#E5F1E2] pt-4">
              {job.status === 'pending' && (
                <Button variant="primary" onClick={confirm} disabled={!!busy}>{busy === 'confirm' ? '…' : 'Confirm'}</Button>
              )}
              {!['cancelled', 'completed'].includes(job.status) && (
                <Button variant="danger" onClick={reject} disabled={!!busy}>{busy === 'reject' ? '…' : 'Cancel Booking'}</Button>
              )}
            </div>
          </div>

          {/* PM Assignment */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Project Manager</h3>
            {job.projectManager ? (
              <div className="text-sm">
                <div className="font-open-sauce-semibold text-[#26472B]">{job.projectManager.name}</div>
                {job.projectManager.mobile && <div className="text-[#909090] text-xs">{job.projectManager.mobile}</div>}
              </div>
            ) : <div className="text-sm text-[#909090]">No PM assigned yet.</div>}
            <div className="mt-3 flex gap-2 flex-wrap">
              <select className="border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" value={pickPm} onChange={(e) => setPickPm(e.target.value)}>
                <option value="">Select a PM…</option>
                {pms.map((p) => <option key={p._id} value={p._id}>{p.name || p.mobile}</option>)}
              </select>
              <Button variant="primary" onClick={assignPm} disabled={!pickPm || busy === 'pm'}>
                {busy === 'pm' ? '…' : (job.projectManager ? 'Reassign' : 'Assign')}
              </Button>
            </div>
          </div>

          {/* Resource Assignment */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Resource</h3>
            {job.assignedResource ? (
              <div className="text-sm">
                <div className="font-open-sauce-semibold text-[#26472B]">{job.assignedResource.name}</div>
                {job.assignedResource.mobile && <div className="text-[#909090] text-xs">{job.assignedResource.mobile}</div>}
              </div>
            ) : <div className="text-sm text-[#909090]">No resource assigned yet.</div>}
            <div className="mt-3 flex gap-2 flex-wrap">
              <select className="border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" value={pickRes} onChange={(e) => setPickRes(e.target.value)}>
                <option value="">Select a resource…</option>
                {resources.map((r) => <option key={r._id} value={r._id}>{r.name || r.mobile}</option>)}
              </select>
              <Button variant="primary" onClick={assignRes} disabled={!pickRes || busy === 'res'}>
                {busy === 'res' ? '…' : (job.assignedResource ? 'Reassign' : 'Assign')}
              </Button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Activity Timeline</h3>
            {(!job.history || job.history.length === 0) ? (
              <div className="text-sm text-[#909090]">No activity yet.</div>
            ) : (
              <div className="space-y-2">
                {[...job.history].reverse().slice(0, 30).map((h, i) => (
                  <div key={i} className="text-xs border-l-2 border-[#45A735] pl-3 py-1">
                    <div className="text-[#26472B] font-open-sauce-semibold">{h.event} <span className="text-[#909090] font-normal">· {h.actorRole}</span></div>
                    {h.note && <div className="text-[#636363]">{h.note}</div>}
                    <div className="text-[#909090]">{fmtDate(h.at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Chat */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-0 flex flex-col h-[600px]">
          <div className="px-5 py-3 border-b border-[#E5F1E2]">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Group Chat</h3>
            <div className="text-[11px] text-[#909090]">Customer · PM · Resource · Admin</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && <div className="text-sm text-[#909090] text-center mt-8">No messages yet.</div>}
            {messages.map((m) => <ChatBubble key={String(m._id)} m={m} mineRole="admin" />)}
            <div ref={chatBottomRef} />
          </div>
          <form onSubmit={sendMessage} className="border-t border-[#E5F1E2] p-3 flex gap-2">
            <input type="text" className="flex-1 border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm"
              placeholder="Reply as admin…" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending} />
            <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>{sending ? '…' : 'Send'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, sub, mono }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">{label}</div>
      <div className={`text-sm text-[#26472B] ${mono ? 'font-mono text-[11px] break-all' : 'font-open-sauce-semibold'}`}>{value || '—'}</div>
      {sub && <div className="text-[11px] text-[#909090]">{sub}</div>}
    </div>
  );
}

function ChatBubble({ m, mineRole }) {
  const role = m.senderRole || 'user';
  const isMine = role === mineRole;
  const palette = {
    pm: 'bg-[#26472B] text-white',
    user: 'bg-[#F1F7EE] text-[#26472B]',
    resource: 'bg-[#FFF3E0] text-[#724500]',
    admin: 'bg-[#E5F1E2] text-[#26472B]',
  };
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${palette[role] || palette.user}`}>
        <div className="text-[10px] uppercase tracking-wider opacity-70 font-open-sauce-semibold">{role}</div>
        <div className="text-sm whitespace-pre-wrap break-words">{m.msg}</div>
        <div className="text-[10px] opacity-60 text-right mt-0.5">
          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </div>
  );
}
