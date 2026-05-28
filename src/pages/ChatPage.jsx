import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  getMessagesForRoom,
  getRoomByKeyOrName,
  joinRoom,
  postMessage,
  subscribeToRoomMessages,
} from '../services/chatService';

const ChatPage = ({ roomKey, roomName, user }) => {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let isMounted = true;

    const loadRoom = async () => {
      setError('');
      try {
        const nextRoom = await getRoomByKeyOrName(roomKey, roomName);
        if (!isMounted) return;

        setRoom(nextRoom);
        if (!nextRoom) {
          setMessages([]);
          return;
        }

        if (nextRoom.is_public) {
          await joinRoom({ roomId: nextRoom.id, userId: user?.id });
        }

        const records = await getMessagesForRoom({ roomKey, roomName });
        if (!isMounted) return;

        setMessages(records);
        unsubscribe = subscribeToRoomMessages({
          roomId: nextRoom.id,
          onInsert: (message) => {
            setMessages((current) => {
              if (current.some((item) => item.id === message.id)) return current;
              return [...current, message].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
            });
          },
        });
      } catch (err) {
        if (isMounted) setError(err.message);
      }
    };

    loadRoom();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomKey, roomName, user?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      const message = await postMessage({
        roomId: room?.id,
        authorId: user?.id,
        body: draft,
      });
      setDraft('');
      if (message) {
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) return current;
          return [...current, message];
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader title={roomName} eyebrow="Controlled Discussion Room">
        Live room messages will appear here when Supabase contains accessible records.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      <section className="message-list" aria-live="polite">
        {messages.length === 0 && <EmptyState message="Start the first discussion." />}
        {messages.map((message) => (
          <article className="message-item" key={message.id}>
            <div>
              <strong>{message.author_id === user?.id ? 'You' : 'Member'}</strong>
              <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
            </div>
            <p>{message.body}</p>
          </article>
        ))}
      </section>
      <form className="composer" onSubmit={handleSubmit}>
        <label>
          Message
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows="3"
            required
          />
        </label>
        <button type="submit" disabled={sending || !room}>
          {sending ? 'Posting...' : 'Post Message'}
        </button>
      </form>
    </>
  );
};

export default ChatPage;
