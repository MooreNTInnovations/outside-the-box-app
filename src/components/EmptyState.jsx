const EmptyState = ({ message = 'No live records found yet. Add records in Supabase or create new content.' }) => (
  <section className="empty-state">
    <p>{message}</p>
  </section>
);

export default EmptyState;
