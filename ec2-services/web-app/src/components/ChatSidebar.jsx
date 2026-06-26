export default function ChatSidebar({ me, chats, activeChat, onSelect, onNew1to1, onNewGroup, onLogout }) {
  return (
    <aside className="chat-sidebar">
      <header className="chat-sidebar-head">
        <strong>{me.email}</strong>
        <button onClick={onLogout} className="link">Logout</button>
      </header>

      <div className="sidebar-actions">
        <button onClick={onNew1to1}>+ Chat</button>
        <button onClick={onNewGroup}>+ Group</button>
      </div>

      <ul className="chat-list">
        {chats.length === 0 && <li className="empty">No conversations yet</li>}
        {chats.map((c) => {
          const title = c.isGroup
            ? c.name
            : c.users?.find((u) => u.id !== me.id)?.email || 'Direct chat';
          return (
            <li
              key={c.id}
              className={activeChat?.id === c.id ? 'active' : ''}
              onClick={() => onSelect(c)}
            >
              <div>
                <div className="title">{title}</div>
                <div className="sub muted">{c.isGroup ? `Group · ${c.users?.length || 0}` : '1:1'}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
