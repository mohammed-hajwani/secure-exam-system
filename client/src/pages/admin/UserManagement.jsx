import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, Dialog, EmptyNotice, Field, Figure, Input, PageHeader, Select, Sheet, SheetHeader, Spinner, Stamp } from '../../components/ui';
import { fmtDate } from '../../utils/format';

const ROLE_LABEL = { STUDENT: 'Student', FACULTY: 'Faculty', ADMIN: 'Administrator' };
const EMPTY_FORM = { name: '', email: '', password: '', role: 'STUDENT', batch: '' };

const UserManagement = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [pendingToggle, setPendingToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  const flash = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const requestToggle = (targetUser) => {
    setError('');
    if (targetUser.id === currentUser?.userId) {
      setError('You cannot deactivate your own administrator account.');
      return;
    }
    setPendingToggle(targetUser);
  };

  const confirmToggle = async () => {
    const targetUser = pendingToggle;
    if (!targetUser) return;
    const nextStatus = !targetUser.isActive;
    try {
      setIsToggling(true);
      await api.patch(`/admin/users/${targetUser.id}/status`, { isActive: nextStatus });
      flash(`${targetUser.name} was ${nextStatus ? 'reactivated' : 'deactivated'}.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change this account.');
    } finally {
      setIsToggling(false);
      setPendingToggle(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setFormError('Fill in the name, email and starting password.');
      return;
    }
    if (formData.role === 'STUDENT' && !formData.batch.trim()) {
      setFormError('Students need a batch so they see the right exams.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/admin/users', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        batch: formData.role === 'STUDENT' ? formData.batch.trim() : null
      });
      flash(`Account created for ${formData.name.trim()}. Share the starting password with them privately.`);
      setIsCreateModalOpen(false);
      setFormData(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create the account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const counts = {
    total: users.length,
    STUDENT: users.filter((u) => u.role === 'STUDENT').length,
    FACULTY: users.filter((u) => u.role === 'FACULTY').length,
    ADMIN: users.filter((u) => u.role === 'ADMIN').length,
    inactive: users.filter((u) => !u.isActive).length
  };

  const filteredUsers = users.filter((u) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.batch && u.batch.toLowerCase().includes(s));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && u.isActive) || (statusFilter === 'DEACTIVATED' && !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Every account is created here. There is no public sign-up."
        actions={
          <Button
            onClick={() => {
              setFormError('');
              setIsCreateModalOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            New account
          </Button>
        }
      />

      <div className="mb-6 space-y-3" aria-live="polite">
        {successMessage && <Alert tone="success">{successMessage}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <Sheet className="mb-6 grid grid-cols-3 divide-paper-line sm:grid-cols-5 sm:divide-x">
        <Figure className="px-5 py-4" label="Accounts" value={counts.total} />
        <Figure className="px-5 py-4" label="Students" value={counts.STUDENT} />
        <Figure className="px-5 py-4" label="Faculty" value={counts.FACULTY} />
        <Figure className="px-5 py-4" label="Admins" value={counts.ADMIN} />
        <Figure className="px-5 py-4" label="Deactivated" value={counts.inactive} tone={counts.inactive > 0 ? 'text-ink-soft' : undefined} />
      </Sheet>

      <Sheet aria-labelledby="users-heading">
        <SheetHeader title={<span id="users-heading">Directory</span>} meta={loading ? '' : `${filteredUsers.length} of ${users.length}`} />
        <div className="grid gap-3 border-b border-paper-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_11rem_11rem] sm:px-5">
          <div className="relative">
            <label htmlFor="user-search" className="sr-only">
              Search accounts
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input
              id="user-search"
              type="search"
              className="pl-9"
              placeholder="Name, email or batch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="user-role" className="sr-only">
              Role
            </label>
            <Select id="user-role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="ALL">All roles</option>
              <option value="STUDENT">Students</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admins</option>
            </Select>
          </div>
          <div>
            <label htmlFor="user-status" className="sr-only">
              Status
            </label>
            <Select id="user-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading accounts" />
        ) : filteredUsers.length === 0 ? (
          <EmptyNotice title="No accounts match" icon={Users}>
            Try a different name, role or status.
          </EmptyNotice>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left">
              <thead>
                <tr className="caps border-b-2 border-ink text-[12px] text-ink-faint">
                  <th scope="col" className="px-5 py-2.5 font-bold">Name</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Role</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Batch</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Activity</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-bold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.userId;
                  return (
                    <tr key={u.id} className="rule-b last:border-b-0">
                      <td className="px-5 py-3.5">
                        <div className={u.isActive ? 'font-bold text-ink' : 'font-bold text-ink-faint line-through'}>
                          {u.name}
                          {isSelf && <span className="ml-2 text-sm font-normal text-ink-faint no-underline">(you)</span>}
                        </div>
                        <div className="text-sm text-ink-faint">{u.email}</div>
                      </td>
                      <td className="px-3 py-3.5 text-[15px] text-ink-soft">{ROLE_LABEL[u.role] || u.role}</td>
                      <td className="num px-3 py-3.5 text-[15px] text-ink-soft">{u.batch || '—'}</td>
                      <td className="num px-3 py-3.5 text-sm text-ink-soft">
                        {u.role === 'STUDENT'
                          ? `${u._count?.attempts ?? 0} attempts`
                          : `${u._count?.examsCreated ?? 0} exams`}
                        <div className="text-ink-faint">since {fmtDate(u.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Stamp status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isSelf && (
                          <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} onClick={() => requestToggle(u)}>
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Sheet>

      {/* Create account */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-user-form" loading={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create account'}
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4" noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}
          <Field label="Full name" required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Email" required hint="Sign-in codes are sent here, so it must be a real inbox.">
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Starting password" required hint="At least 8 characters. Ask them to change it from their profile.">
            <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </Field>
            {formData.role === 'STUDENT' && (
              <Field label="Batch" required>
                <Input value={formData.batch} onChange={(e) => setFormData({ ...formData, batch: e.target.value })} placeholder="CS-2026-A" />
              </Field>
            )}
          </div>
        </form>
      </Dialog>

      {/* Activate / deactivate */}
      <Dialog
        open={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        title={pendingToggle?.isActive ? 'Deactivate this account?' : 'Reactivate this account?'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingToggle(null)}>
              Cancel
            </Button>
            <Button variant={pendingToggle?.isActive ? 'danger' : 'primary'} loading={isToggling} onClick={confirmToggle}>
              {pendingToggle?.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink">
          <strong>{pendingToggle?.name}</strong> · {pendingToggle?.email}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {pendingToggle?.isActive
            ? 'They will be signed out within 15 minutes and cannot sign in again until reactivated. Their exam records are kept.'
            : 'They will be able to sign in again with their existing password.'}
        </p>
      </Dialog>
    </div>
  );
};

export default UserManagement;
