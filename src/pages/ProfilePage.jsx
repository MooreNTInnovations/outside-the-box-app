import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getCurrentProfile, updateCurrentProfile } from '../services/profileService';

const ProfilePage = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    title: '',
    organization: '',
    discipline: '',
    bio: '',
    expertiseTags: '',
  });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getCurrentProfile(user?.id)
      .then((record) => {
        setProfile(record);
        if (record) {
          setForm({
            fullName: record.full_name || '',
            title: record.title || '',
            organization: record.organization || '',
            discipline: record.discipline || '',
            bio: record.bio || '',
            expertiseTags: record.expertise_tags?.join(', ') || '',
          });
        }
      })
      .catch((err) => setError(err.message));
  }, [user?.id]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    try {
      const updated = await updateCurrentProfile(user.id, form);
      setProfile(updated);
      setStatus('Profile updated.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Profile" eyebrow="Authenticated Identity">
        Signed in as {user?.email}
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}
      {!profile && <EmptyState message="Complete your profile." />}
      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input name="fullName" value={form.fullName} onChange={updateField} />
        </label>
        <label>
          Title
          <input name="title" value={form.title} onChange={updateField} />
        </label>
        <label>
          Organization
          <input name="organization" value={form.organization} onChange={updateField} />
        </label>
        <label>
          Discipline
          <input name="discipline" value={form.discipline} onChange={updateField} />
        </label>
        <label>
          Bio
          <textarea name="bio" value={form.bio} onChange={updateField} rows="5" />
        </label>
        <label>
          Expertise tags
          <input
            name="expertiseTags"
            value={form.expertiseTags}
            onChange={updateField}
            placeholder="materials science, robotics, clinical research"
          />
        </label>
        <button type="submit">Update Profile</button>
      </form>
    </>
  );
};

export default ProfilePage;
