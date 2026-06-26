import { useEffect, useRef, useState } from 'react';

export default function ChatWindow({ me, chat, messages, typingUsers, onSend, onTyping }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chat?.id]);

  if (!chat) {
    return <main className="chat-window empty">Select a conversation to start chatting</main>;
  }

  const title = chat.isGroup
    ? chat.name
    : chat.users?.find((u) => u.id !== me.id)?.email || 'Direct chat';

  const onChange = (e) => {
    setDraft(e.target.value);
    onTyping?.(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping?.(false), 1200);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
    onTyping?.(false);
  };

  const someoneTyping = typingUsers && typingUsers.size > 0;

  return (
    <main className="chat-window">
      <header className="chat-head">
        <h2>{title}</h2>
        <span className="muted">{chat.isGroup ? `${chat.users?.length || 0} members` : '1:1'}</span>
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.map((m) => {
          const own = m.senderId === me.id;
          return (
            <div key={m.id} className={`msg ${own ? 'own' : ''}`}>
              {!own && chat.isGroup && (
                <div className="msg-sender">{m.sender?.email}</div>
              )}
              <div className="bubble">
                {m.isDeleted ? <em className="muted">message deleted</em> : m.content}
              </div>
              <div className="msg-meta">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {m.isEdited && ' · edited'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="typing-row">{someoneTyping && 'Someone is typing…'}</div>

      <form className="composer" onSubmit={submit}>
        <input placeholder="Type a message…" value={draft} onChange={onChange} autoFocus />
        <button type="submit" disabled={!draft.trim()}>Send</button>
      </form>
    </main>
  );
}
