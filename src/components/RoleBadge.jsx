const formatRole = (role) => (role ? role.replace(/_/g, ' ') : 'member');

const RoleBadge = ({ role }) => (
  <span className="role-badge">{formatRole(role)}</span>
);

export default RoleBadge;
