import { useEffect, useMemo, useState } from 'react';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  archiveRoom,
  createReport,
  createRoom,
  getMessagesForRoom,
  getRoomById,
  getRoomByKeyOrName,
  getRoomMembers,
  getRooms,
  inviteRoomMembers,
  joinRoom,
  leaveRoom,
  postMessage,
  removeRoomMember,
  subscribeToRoomMessages,
  updateRoom,
} from '../services/chatService';
import { getProfiles } from '../services/profileService';

const emptyRoomForm = {
  name: '',
  description: '',
  visibility: 'public',
  invitedUserIds: [],
};

const ChatPage = ({ roomKey, roomName, user, currentProfile }) => {
  const [rooms, setRooms] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [editForm, setEditForm] = useState({ name: '', description: '', visibility: 'public' });
  const [inviteIds, setInviteIds] = useState([]);
  const [draft, setDraft] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);
  const [sending, setSending] = useState(false);

  const isAdmin = currentProfile?.role === 'admin';
  const selectedMembership = members.find((member) => member.user_id === user?.id);
  const isRoomOwner = room?.owner_id === user?.id || selectedMembership?.role === 'owner';
  const canManageRoom = Boolean(isAdmin || (isRoomOwner && !room?.is_system));

  const loadDirectory = () => {
    setLoading(true);
    Promise.all([getRooms(), getProfiles()])
      .then(([roomRecords, profileRecords]) => {
        setRooms(roomRecords);
        setProfiles(profileRecords);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const loadRoomWorkspace = async (roomId) => {
    if (!roomId) return;

    setError('');
    setLoading(true);
    try {
      const [roomRecord, memberRecords, messageRecords] = await Promise.all([
        getRoomById(roomId),
        getRoomMembers(roomId),
        getMessagesForRoom({ roomId }),
      ]);

      setRoom(roomRecord);
      setMembers(memberRecords);
      setMessages(messageRecords);
      setEditForm({
        name: roomRecord?.name || '',
        description: roomRecord?.description || '',
        visibility: roomRecord?.visibility || (roomRecord?.is_public ? 'public' : 'private'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSystemRoom = async () => {
      if (!roomKey && !roomName) return;

      setLoading(true);
      setError('');
      try {
        const nextRoom = await getRoomByKeyOrName(roomKey, roomName);
        if (!isMounted) return;

        if (nextRoom?.is_public) {
          await joinRoom({ roomId: nextRoom.id, userId: user?.id });
        }

        setSelectedRoomId(nextRoom?.id || null);
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadSystemRoom();

    return () => {
      isMounted = false;
    };
  }, [roomKey, roomName, user?.id]);

  useEffect(() => {
    if (!selectedRoomId) return undefined;

    loadRoomWorkspace(selectedRoomId).catch((err) => setError(err.message));

    return subscribeToRoomMessages({
      roomId: selectedRoomId,
      onInsert: () => loadRoomWorkspace(selectedRoomId).catch((err) => setError(err.message)),
    });
  }, [selectedRoomId]);

  const availableInviteProfiles = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.user_id));
    return profiles.filter((profile) => profile.id !== user?.id && !memberIds.has(profile.id));
  }, [members, profiles, user?.id]);

  const updateRoomForm = (event) => {
    const { name, value, selectedOptions } = event.target;
    if (name === 'invitedUserIds') {
      setRoomForm((current) => ({
        ...current,
        invitedUserIds: Array.from(selectedOptions).map((option) => option.value),
      }));
      return;
    }

    setRoomForm((current) => ({ ...current, [name]: value }));
  };

  const updateEditForm = (event) => {
    setEditForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setSavingRoom(true);
    try {
      const createdRoomId = await createRoom(roomForm);
      setRoomForm(emptyRoomForm);
      setStatus('Room created.');
      loadDirectory();
      setSelectedRoomId(createdRoomId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRoom(false);
    }
  };

  const handleUpdateRoom = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    try {
      await updateRoom({ roomId: room.id, ...editForm });
      setStatus('Room updated.');
      await loadRoomWorkspace(room.id);
      loadDirectory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInviteMembers = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    try {
      await inviteRoomMembers({ roomId: room.id, invitedUserIds: inviteIds });
      setInviteIds([]);
      setStatus('Room members invited.');
      await loadRoomWorkspace(room.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinRoom = async (roomId) => {
    setError('');
    setStatus('');
    try {
      await joinRoom({ roomId, userId: user?.id });
      setStatus('Room joined.');
      await loadRoomWorkspace(roomId);
      loadDirectory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveRoom = async () => {
    setError('');
    setStatus('');
    try {
      await leaveRoom({ roomId: room.id });
      setStatus('Room left.');
      setSelectedRoomId(null);
      setRoom(null);
      loadDirectory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchiveRoom = async () => {
    if (!window.confirm('Archive this room? Existing messages remain governed by Supabase policies.')) return;

    setError('');
    setStatus('');
    try {
      await archiveRoom({ roomId: room.id });
      setStatus('Room archived.');
      setSelectedRoomId(null);
      setRoom(null);
      loadDirectory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm('Remove this member from the room?')) return;

    setError('');
    setStatus('');
    try {
      await removeRoomMember({ roomId: room.id, userId: memberUserId });
      setStatus('Room member removed.');
      await loadRoomWorkspace(room.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitMessage = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
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

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportTarget) return;

    setError('');
    setStatus('');
    try {
      await createReport({
        reporterId: user?.id,
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        roomId: room?.id,
        reason: reportReason,
      });
      setReportReason('');
      setReportTarget(null);
      setStatus('Report submitted for governance review.');
    } catch (err) {
      setError(err.message);
    }
  };

  const renderRoomDirectory = () => (
    <>
      <PageHeader title="Chat Rooms" eyebrow="Controlled Discussion Rooms">
        Create public or private professional rooms backed by Supabase permissions.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}
      <form className="record-form" onSubmit={handleCreateRoom}>
        <label>
          Room name
          <input name="name" value={roomForm.name} onChange={updateRoomForm} required />
        </label>
        <label>
          Description
          <textarea name="description" value={roomForm.description} onChange={updateRoomForm} rows="3" />
        </label>
        <label>
          Visibility
          <select name="visibility" value={roomForm.visibility} onChange={updateRoomForm}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        {roomForm.visibility === 'private' && (
          <label>
            Invite members
            <select
              multiple
              name="invitedUserIds"
              value={roomForm.invitedUserIds}
              onChange={updateRoomForm}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email || profile.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" disabled={savingRoom}>
          {savingRoom ? 'Creating...' : 'Create Chat Room'}
        </button>
      </form>

      {loading && <p className="loading-note">Loading rooms...</p>}
      {!loading && rooms.length === 0 && <EmptyState message="No chat rooms available yet." />}
      <section className="record-grid">
        {rooms.map((roomRecord) => {
          const membership = roomRecord.room_members?.find((member) => member.user_id === user?.id);
          return (
            <article className="record-card" key={roomRecord.id}>
              <div>
                <h2>{roomRecord.name}</h2>
                <span>{roomRecord.visibility || (roomRecord.is_public ? 'public' : 'private')}</span>
              </div>
              {roomRecord.description && <p>{roomRecord.description}</p>}
              <p>Owner: {roomRecord.profiles?.full_name || roomRecord.profiles?.email || 'System room'}</p>
              <div className="record-actions">
                <button type="button" onClick={() => setSelectedRoomId(roomRecord.id)}>
                  Open Room
                </button>
                {roomRecord.is_public && !membership && (
                  <button type="button" onClick={() => handleJoinRoom(roomRecord.id)}>
                    Join Room
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );

  const renderReportForm = () => {
    if (!reportTarget) return null;

    return (
      <form className="record-form compact-form" onSubmit={submitReport}>
        <label>
          Report reason
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            rows="3"
            required
          />
        </label>
        <div className="record-actions">
          <button type="submit">Submit Report</button>
          <button type="button" onClick={() => setReportTarget(null)}>
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const renderRoomWorkspace = () => {
    if (!room && loading) {
      return <p className="loading-note">Loading room...</p>;
    }

    if (!room) {
      return (
        <>
          <PageHeader title="Room Not Found" eyebrow="Controlled Discussion Room">
            The selected room is not visible under the current Supabase policies.
          </PageHeader>
          {error && <p className="service-error">{error}</p>}
          {!roomKey && (
            <button type="button" onClick={() => setSelectedRoomId(null)}>
              Back to Chat Rooms
            </button>
          )}
        </>
      );
    }

    return (
      <>
        <PageHeader title={room.name} eyebrow="Controlled Discussion Room">
          {room.description || 'No room description has been saved yet.'}
        </PageHeader>
        {error && <p className="service-error">{error}</p>}
        {status && <p className="service-success">{status}</p>}
        <section className="project-header-panel">
          <dl className="detail-list project-meta-list">
            <div>
              <dt>Visibility</dt>
              <dd>{room.visibility || (room.is_public ? 'public' : 'private')}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{room.profiles?.full_name || room.profiles?.email || 'System room'}</dd>
            </div>
            <div>
              <dt>Membership</dt>
              <dd>{selectedMembership?.role || (room.is_public ? 'Public access' : 'Role access')}</dd>
            </div>
          </dl>
          <div className="record-actions">
            {!roomKey && (
              <button type="button" onClick={() => setSelectedRoomId(null)}>
                Back to Chat Rooms
              </button>
            )}
            {room.is_public && !selectedMembership && (
              <button type="button" onClick={() => handleJoinRoom(room.id)}>
                Join Room
              </button>
            )}
            {selectedMembership && !isRoomOwner && (
              <button type="button" onClick={handleLeaveRoom}>
                Leave Room
              </button>
            )}
            {!room.is_system && (
              <button
                type="button"
                onClick={() => setReportTarget({ type: 'room', id: room.id })}
              >
                Report Room
              </button>
            )}
          </div>
          {renderReportForm()}
        </section>

        <section className="project-workspace chat-workspace">
          <article className="detail-panel">
            <h2>Room Discussion</h2>
            {messages.length === 0 && <EmptyState message="Start the first discussion." />}
            <form className="composer project-composer" onSubmit={handleSubmitMessage}>
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
            {messages.map((message) => (
              <article className="message-item" key={message.id}>
                <div className="message-meta">
                  <span className="avatar-label">
                    <Avatar profile={message.authorProfile} label={message.authorLabel} size="sm" />
                    <strong>{message.author_id === user?.id ? 'You' : message.authorLabel}</strong>
                  </span>
                  <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                </div>
                <p>{message.body}</p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setReportTarget({ type: 'message', id: message.id })}
                >
                  Report
                </button>
              </article>
            ))}
          </article>

          <article className="detail-panel">
            <h2>Room Members ({members.length})</h2>
            {members.length === 0 && <EmptyState message="No room members are visible yet." />}
            {members.map((member) => (
              <article className="member-row" key={`${member.room_id}-${member.user_id}`}>
                <span className="avatar-label">
                  <Avatar profile={member.profiles} label={member.displayName} size="sm" />
                  <strong>{member.displayName}</strong>
                </span>
                <span>{member.role}</span>
                {canManageRoom && member.user_id !== room.owner_id && (
                  <button type="button" onClick={() => handleRemoveMember(member.user_id)}>
                    Remove
                  </button>
                )}
              </article>
            ))}
          </article>

          {canManageRoom && (
            <article className="detail-panel">
              <h2>Room Governance</h2>
              <form className="record-form compact-form" onSubmit={handleUpdateRoom}>
                <label>
                  Room name
                  <input name="name" value={editForm.name} onChange={updateEditForm} required />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={updateEditForm}
                    rows="3"
                  />
                </label>
                <label>
                  Visibility
                  <select name="visibility" value={editForm.visibility} onChange={updateEditForm}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <button type="submit">Save Room</button>
              </form>
              <form className="record-form compact-form" onSubmit={handleInviteMembers}>
                <label>
                  Invite members
                  <select
                    multiple
                    value={inviteIds}
                    onChange={(event) =>
                      setInviteIds(Array.from(event.target.selectedOptions).map((option) => option.value))
                    }
                  >
                    {availableInviteProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email || profile.id}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={inviteIds.length === 0}>
                  Invite Selected Members
                </button>
              </form>
              {!room.is_system && (
                <button className="danger-button" type="button" onClick={handleArchiveRoom}>
                  Archive Room
                </button>
              )}
            </article>
          )}
        </section>
      </>
    );
  };

  if (roomKey || selectedRoomId) {
    return renderRoomWorkspace();
  }

  return renderRoomDirectory();
};

export default ChatPage;
