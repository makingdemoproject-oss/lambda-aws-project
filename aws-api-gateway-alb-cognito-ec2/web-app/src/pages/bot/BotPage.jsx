/**
 * AI chat page — talks to the bot-service via the centralized axios client.
 *
 *   • Left column: list of past conversations, "New chat" button
 *   • Right column: messages of the selected conversation + a composer
 *
 * Conversations and messages are paginated, but for the v1 UX we just load
 * the latest 50 each. The send-message endpoint is rate-limited server-side
 * (bot-service caps it at 30/min); we surface the 429 verbatim.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { http } from '../../api/http.js';

const BOT = '/bot';

export default function BotPage() {
  const { t } = useTranslation();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState(null);

  useEffect(() => { void loadConvos(); }, []);
  const loadConvos = async () => {
    const { data } = await http.get(`${BOT}/conversations`, { params: { page: 1, pageSize: 50 } });
    const items = data.data.items;
    setConvos(items);
    if (!active && items[0]) selectConvo(items[0].id);
  };
  const selectConvo = async (id) => {
    setActive(id);
    const { data } = await http.get(`${BOT}/conversations/${id}/messages`, { params: { page: 1, pageSize: 50 } });
    setMessages(data.data.items);
  };
  const newConvo = async () => {
    const { data } = await http.post(`${BOT}/conversations`, { title: 'New chat' });
    await loadConvos();
    selectConvo(data.data.id);
  };
  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || !active) return;
    setBusy(true); setErr(null);
    const optimistic = { id: `tmp-${Date.now()}`, role: 'user', content: input };
    setMessages((m) => [...m, optimistic]);
    setInput('');
    try {
      const { data } = await http.post(`${BOT}/conversations/${active}/messages`, { content: optimistic.content });
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), ...data.data]);
    } catch (e2) {
      setErr(e2.response?.data?.message || t('errors.generic'));
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally { setBusy(false); }
  };

  return (
    <div className="bot-shell">
      <aside className="bot-side">
        <button className="btn btn-primary btn-block" onClick={newConvo}>+ New chat</button>
        <ul className="bot-convos">
          {convos.map((c) => (
            <li key={c.id} className={c.id === active ? 'active' : ''} onClick={() => selectConvo(c.id)}>
              <strong>{c.title || 'Untitled'}</strong>
              <small className="muted">{c.lastMessageAt?.slice(0, 16).replace('T', ' ')}</small>
            </li>
          ))}
        </ul>
      </aside>
      <main className="bot-main">
        <div className="bot-messages">
          {messages.map((m) => (
            <div key={m.id} className={`msg msg-${m.role}`}>
              <div className="role">{m.role}</div>
              <div className="content">{m.content}</div>
            </div>
          ))}
          {busy && <div className="muted">…</div>}
          {err && <div className="error">{err}</div>}
        </div>
        <form className="bot-composer" onSubmit={send}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the bot anything…"
            disabled={busy || !active}
          />
          <button className="btn btn-primary" disabled={busy || !input.trim() || !active}>Send</button>
        </form>
      </main>
    </div>
  );
}
