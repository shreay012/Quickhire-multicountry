'use client';
import { showError, showSuccess } from '@/lib/utils/toast';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await staffApi.get(`/admin/tickets/${id}/detail`);
      setTicket(r.data?.data?.ticket || null);
      setMessages(r.data?.data?.messages || []);
    } catch (e) { setError(e); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await staffApi.post(`/admin/tickets/${id}/message`, { msg: text });
      setMessages((arr) => [...arr, r.data?.data]);
      setDraft('');
    } catch (e) { showError(e?.response?.data?.error?.message || 'Failed'); }
    finally { setSending(false); }
  };

  const setStatus = async (s) => {
    setBusy(s);
    try { await staffApi.patch(`/admin/tickets/${id}/status`, { status: s }); await load(); }
    catch (e) { showError(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(null); }
  };

  if (error) return <div className="p-6"><ErrorBox error={error} /></div>;
  if (!ticket) return <div className="p-6"><Spinner /></div>;

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        subtitle={`Ticket ${String(ticket._id).slice(-8)} · ${ticket.customerName}`}
        action={<Button variant="subtle" size="sm" onClick={() => router.push('/admin/tickets')}>← Back</Button>}
      />
      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Status</h3>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <Button key={s} size="sm" variant={s === ticket.status ? 'primary' : 'outline'} onClick={() => setStatus(s)} disabled={busy === s}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-2">Description</h3>
            <div className="text-sm text-[#484848] whitespace-pre-wrap">{ticket.description || '—'}</div>
            {ticket.bookingId && (
              <div className="mt-3 pt-3 border-t border-[#E5F1E2] text-xs text-[#909090]">
                Linked booking: <code className="font-mono">{String(ticket.bookingId).slice(-8)}</code>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5F1E2] flex flex-col h-[600px]">
          <div className="px-5 py-3 border-b border-[#E5F1E2]">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Conversation</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && <div className="text-sm text-[#909090] text-center mt-8">No messages yet.</div>}
            {messages.map((m) => {
              const isMine = m.senderRole === 'admin';
              return (
                <div key={String(m._id)} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMine ? 'bg-[#26472B] text-white' : 'bg-[#F1F7EE] text-[#26472B]'}`}>
                    <div className="text-[10px] uppercase tracking-wider opacity-70 font-open-sauce-semibold">{m.senderRole}</div>
                    <div className="text-sm whitespace-pre-wrap break-words">{m.msg}</div>
                    <div className="text-[10px] opacity-60 text-right mt-0.5">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="border-t border-[#E5F1E2] p-3 flex gap-2">
            <input type="text" className="flex-1 border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm"
              placeholder="Reply as admin…" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending} />
            <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>{sending ? '…' : 'Send'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
