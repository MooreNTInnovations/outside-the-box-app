import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getMessagesForRoom } from '../services/chatService';

const ChatPage = ({ roomKey, roomName }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getMessagesForRoom({ roomKey, roomName }).then(setMessages).catch((err) => setError(err.message));
  }, [roomKey, roomName]);

  return (
    <>
      <PageHeader title={roomName} eyebrow="Controlled Discussion Room">
        Live room messages will appear here when Supabase contains accessible records.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {messages.length === 0 && <EmptyState />}
    </>
  );
};

export default ChatPage;
