import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { Plus, Edit, Trash2, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'Staff',
    status: 'Active'
  });

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsersList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getUsers();
      setUsers(res || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShowPassword(false);
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'Staff',
      status: 'Active'
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setShowPassword(false);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '', // Blank password unless changing
      role: user.role || 'Staff',
      status: user.status || 'Active'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email) {
      alert('Name, Username, and Email are required.');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Password is required for new users.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await updateUser(editingUser._id, formData);
      } else {
        await createUser(formData);
      }
      setModalOpen(false);
      fetchUsersList();
    } catch (err) {
      alert(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteUser(deleteTarget._id);
      setDeleteTarget(null);
      fetchUsersList();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs shrink-0">
            {row.name ? row.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-400">@{row.username}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      cell: (row) => <span className="font-mono text-xs text-slate-700 font-medium">{row.email}</span>
    },
    {
      header: 'Role',
      cell: (row) => {
        const roleStyles = {
          Superadmin: 'bg-red-100 text-red-800 border-red-200',
          Admin: 'bg-purple-100 text-purple-800 border-purple-200',
          Staff: 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${roleStyles[row.role] || roleStyles.Staff}`}>
            {row.role}
          </span>
        );
      }
    },
    {
      header: 'Status',
      cell: (row) => (
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
          row.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="BENZ System Users Management" />

      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-800">System Accounts & Authorization</h3>
            <p className="text-xs text-slate-400">Manage portal access credentials and admin roles</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={18} />
            Add User Account
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching user accounts from MongoDB Atlas..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchUsersList} />
        ) : users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="No system users created in MongoDB Atlas yet."
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Add User Account
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            emptyMessage="No users found."
          />
        )}
      </div>

      {/* ADD / EDIT USER MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? `Edit User: ${editingUser.name}` : 'Add New User Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="User's full name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. john_staff"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. user@benz.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Password {editingUser ? '(Leave blank to keep unchanged)' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Access Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold"
              >
                <option value="Superadmin">Superadmin</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md"
            >
              {submitting ? 'Saving...' : editingUser ? 'Update Account' : 'Save User Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={`Are you sure you want to delete user account "${deleteTarget?.name}" (@${deleteTarget?.username})?`}
      />
    </MainLayout>
  );
};

export default UsersPage;
