import { useState, useEffect } from 'react';
import { usersApi, type User, type UserType } from '../services/usersApi';
import { useAuthStore } from '../store/authStore';
import Loader from '../components/Loader';

const UserManagement = () => {
  const { user: currentUser, isAdmin } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create user form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'user' as UserType,
  });

  // Suspend confirmation
  const [suspendConfirm, setSuspendConfirm] = useState<string | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setCreateLoading(true);
      await usersApi.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        userType: formData.userType,
      });
      setSuccess('User created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', confirmPassword: '', userType: 'user' });
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      setSuspendLoading(true);
      await usersApi.suspendUser(userId);
      setSuccess('User suspended successfully');
      setSuspendConfirm(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to suspend user');
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      setSuspendLoading(true);
      await usersApi.unsuspendUser(userId);
      setSuccess('User unsuspended successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unsuspend user');
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleUpdateUserType = async (userId: string, userType: UserType) => {
    try {
      await usersApi.updateUserType(userId, userType);
      setSuccess('User type updated successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user type');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">403</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1 font-medium">Manage system users and permissions</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create User
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 min-h-screen">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-800">{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <h2 className="text-lg font-bold text-gray-900">All Users ({users.length})</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" text="Loading users..." color="blue" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Create your first user to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-blue-600 font-medium">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.userType}
                          onChange={(e) => handleUpdateUserType(user.id, e.target.value as UserType)}
                          disabled={user.id === currentUser?.id}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 focus:ring-2 focus:ring-offset-1 ${
                            user.userType === 'admin'
                              ? 'bg-purple-100 text-purple-800 focus:ring-purple-500'
                              : 'bg-gray-100 text-gray-800 focus:ring-gray-500'
                          } ${user.id === currentUser?.id ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {user.id !== currentUser?.id && (
                          <>
                            {suspendConfirm === user.id ? (
                              <div className="flex items-center justify-end space-x-2">
                                <span className="text-xs text-gray-600">Confirm suspend?</span>
                                <button
                                  onClick={() => handleSuspendUser(user.id)}
                                  disabled={suspendLoading}
                                  className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {suspendLoading ? '...' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setSuspendConfirm(null)}
                                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                  No
                                </button>
                              </div>
                            ) : user.status === 'suspended' ? (
                              <button
                                onClick={() => handleUnsuspendUser(user.id)}
                                disabled={suspendLoading}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                title="Unsuspend user"
                              >
                                Unsuspend
                              </button>
                            ) : (
                              <button
                                onClick={() => setSuspendConfirm(user.id)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                                title="Suspend user"
                              >
                                Suspend
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
                  <p className="text-sm text-gray-600 mt-1">Add a new user to the system</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter password (min 6 characters)"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Confirm password"
                  />
                </div>

                <div>
                  <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                    User Type *
                  </label>
                  <select
                    id="userType"
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value as UserType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Admins can manage users and have full system access.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {createLoading ? (
                      <>
                        <Loader size="sm" text="" color="blue" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
