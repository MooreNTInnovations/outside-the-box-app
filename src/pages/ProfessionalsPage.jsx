import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import RoleBadge from '../components/RoleBadge';
import { createModerationReport } from '../services/moderationService';
import { getProfileById, getProfiles } from '../services/profileService';

const ProfessionalsPage = ({ user }) => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getProfiles().then(setProfiles).catch((err) => setError(err.message));
  }, []);

  const openProfile = async (profileId) => {
    setError('');
    setSelectedProfileId(profileId);
    setLoadingProfile(true);

    try {
      const record = await getProfileById(profileId);
      setSelectedProfile(record);
    } catch (err) {
      setError(err.message);
      setSelectedProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const backToDirectory = () => {
    setSelectedProfile(null);
    setSelectedProfileId(null);
    setError('');
  };

  const submitProfileReport = async (event) => {
    event.preventDefault();
    if (!selectedProfile) return;

    setError('');
    setStatus('');
    try {
      await createModerationReport({
        reporterId: user?.id,
        targetType: 'profile',
        targetId: selectedProfile.id,
        reason: reportReason,
      });
      setReportReason('');
      setStatus('Concern submitted for governance review.');
    } catch (err) {
      setError(err.message);
    }
  };

  const displayValue = (value) => value || 'Not provided';

  const renderProfileName = (profile) =>
    profile.full_name || profile.email || 'Profile record';

  if (selectedProfileId) {
    const tags = selectedProfile?.expertise_tags || [];

    return (
      <>
        <PageHeader title="Profile Detail" eyebrow="Professional Directory">
          Live profile data from Supabase.
        </PageHeader>
        {error && <p className="service-error">{error}</p>}
        <button type="button" onClick={backToDirectory}>
          Back to Professionals
        </button>
        {status && <p className="service-success">{status}</p>}
        {loadingProfile && <p className="loading-note">Loading profile...</p>}
        {!loadingProfile && !selectedProfile && (
          <EmptyState message="Profile record is not available." />
        )}
        {!loadingProfile && selectedProfile && (
          <section className="detail-panel profile-detail-panel">
            <Avatar profile={selectedProfile} size="lg" />
            <h2>{displayValue(selectedProfile.full_name)}</h2>
            <dl className="detail-list">
              <div>
                <dt>Email</dt>
                <dd>{displayValue(selectedProfile.email)}</dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{displayValue(selectedProfile.title)}</dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{displayValue(selectedProfile.organization)}</dd>
              </div>
              <div>
                <dt>Discipline</dt>
                <dd>{displayValue(selectedProfile.discipline)}</dd>
              </div>
              <div>
                <dt>Bio</dt>
                <dd>{displayValue(selectedProfile.bio)}</dd>
              </div>
              <div>
                <dt>Expertise Tags</dt>
                <dd>
                  {tags.length > 0 ? (
                    <span className="tag-list">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </span>
                  ) : (
                    'Not provided'
                  )}
                </dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd><RoleBadge role={selectedProfile.role} /></dd>
              </div>
            </dl>
            <form className="record-form compact-form" onSubmit={submitProfileReport}>
              <label>
                Report a Concern
                <textarea
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  rows="3"
                  required
                />
              </label>
              <button type="submit">Submit Concern</button>
            </form>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Professionals" eyebrow="Professional Directory">
        Live professional profile records will appear here when available.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {profiles.length === 0 && <EmptyState message="No professional profiles available yet." />}
      <section className="record-grid">
        {profiles.map((profile) => (
          <article className="record-card" key={profile.id}>
            <div>
              <h2>
                <button
                  className="profile-name-button"
                  type="button"
                  onClick={() => openProfile(profile.id)}
                >
                  <Avatar profile={profile} label={renderProfileName(profile)} size="sm" />
                  {renderProfileName(profile)}
                </button>
              </h2>
              {profile.discipline && <span>{profile.discipline}</span>}
            </div>
            {profile.title && <p>{profile.title}</p>}
            <RoleBadge role={profile.role} />
            {profile.organization && <p>{profile.organization}</p>}
            {profile.expertise_tags?.length > 0 && (
              <p>{profile.expertise_tags.join(', ')}</p>
            )}
          </article>
        ))}
      </section>
    </>
  );
};

export default ProfessionalsPage;
