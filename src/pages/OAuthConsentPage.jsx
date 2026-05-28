import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';

const OAuthConsentPage = ({ user }) => (
  <>
    <PageHeader title="Authorization Consent" eyebrow="Secure Access Review">
      Signed in as {user?.email}. Authorization requests for OutSide the Box will be reviewed here
      when a live OAuth workflow is configured.
    </PageHeader>
    <section className="auth-context-panel">
      <p>
        No live authorization request was provided with this visit. Continue only from a trusted
        authorization flow.
      </p>
    </section>
    <EmptyState message="No authorization request is active." />
  </>
);

export default OAuthConsentPage;
