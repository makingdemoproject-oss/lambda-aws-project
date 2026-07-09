import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket, disconnectSocket } from '../sockets/socket.js';
import { chat as chatApi } from '../api/index.js';
import ChatSidebar from '../components/ChatSidebar.jsx';
import ChatWindow  from '../components/ChatWindow.jsx';
import NewChatModal from '../components/NewChatModal.jsx';
import NewGroupModal from '../components/NewGroupModal.jsx';

/**
 * Thin orchestrator — owns state + socket wiring + API calls only.
 * All UI is in <ChatSidebar /> + <ChatWindow /> + the two modals.
 */
export default function ChatPage() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});             // { chatId: Set<userId> }
  const [showNew1to1, setShowNew1to1]   = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const socketRef = useRef(null);
  const activeChatRef = useRef(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // ─── load chat list + open socket once ───────────────────────────────
  useEffect(() => {
    chatApi.list().then(setChats).catch(() => {});

    const s = connectSocket();
    socketRef.current = s;

    s.on('connect_error', (e) => console.warn('socket connect_error', e.message));

    s.on('chat:created', (c) => {
      setChats((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    });
    s.on('chat:updated', (c) => {
      setChats((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    });

    s.on('message:new', (m) => {
      setChats((prev) => prev.map((c) => (c.id === m.chatId ? { ...c, lastMessageAt: m.createdAt } : c)));
      if (activeChatRef.current?.id === m.chatId) setMessages((prev) => [...prev, m]);
    });
    s.on('message:updated', (m) =>
      setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x))));
    s.on('message:deleted', ({ id }) =>
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, isDeleted: true, content: '' } : x))));

    s.on('typing:start', ({ chatId, userId }) => {
      setTypingUsers((prev) => {
        const set = new Set(prev[chatId] || []); set.add(userId);
        return { ...prev, [chatId]: set };
      });
    });
    s.on('typing:stop', ({ chatId, userId }) => {
      setTypingUsers((prev) => {
        const set = new Set(prev[chatId] || []); set.delete(userId);
        return { ...prev, [chatId]: set };
      });
    });

    return () => { disconnectSocket(); };
  }, []);                                                             // eslint-disable-line

  // ─── actions ─────────────────────────────────────────────────────────
  const openChat = useCallback(async (c) => {
    setActiveChat(c);
    const list = await chatApi.messages(c.id);
    setMessages(list);
    socketRef.current?.emit('chat:join', { chatId: c.id });
    const unread = list.filter((m) => m.senderId !== user.id).map((m) => m.id);
    if (unread.length) chatApi.markRead(c.id, unread).catch(() => {});
  }, [user.id]);

  const sendMessage = useCallback((content) => {
    if (!activeChat || !content.trim()) return;
    socketRef.current?.emit('message:send',
      { chatId: activeChat.id, content: content.trim() },
      (ack) => { if (!ack?.ok) console.warn('send failed:', ack?.error); });
  }, [activeChat]);

  const onTyping = useCallback((isTyping) => {
    if (!activeChat) return;
    socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', { chatId: activeChat.id });
  }, [activeChat]);

  const start1to1 = async (userId) => {
    const c = await chatApi.create1to1(userId);
    setShowNew1to1(false);
    setChats((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    openChat(c);
  };

  const createGroup = async (payload) => {
    const c = await chatApi.createGroup(payload);
    setShowNewGroup(false);
    setChats((prev) => [c, ...prev]);
    openChat(c);
  };

  // ─── render ──────────────────────────────────────────────────────────
  return (
    <div className="chat-shell">
      <ChatSidebar
        me={user}
        chats={chats}
        activeChat={activeChat}
        onSelect={openChat}
        onNew1to1={() => setShowNew1to1(true)}
        onNewGroup={() => setShowNewGroup(true)}
        onLogout={logout}
      />
      <ChatWindow
        me={user}
        chat={activeChat}
        messages={messages}
        typingUsers={activeChat ? typingUsers[activeChat.id] : null}
        onSend={sendMessage}
        onTyping={onTyping}
      />
      {showNew1to1  && <NewChatModal  onClose={() => setShowNew1to1(false)}  onPick={start1to1} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreate={createGroup} />}
    </div>
  );
}
