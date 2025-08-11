import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import api from '../lib/api';
import '../App.css';

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        designation: 'guest'
    });

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data.users);
        } catch (error) {
            setError('Failed to fetch users');
            if (error.response?.status === 403) {
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password || !formData.designation) {
            setError('All fields are required');
            return;
        }

        try {
            await api.post('/users', formData);
            setFormData({ username: '', password: '', designation: 'guest' });
            setShowCreateForm(false);
            fetchUsers();
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.designation) {
            setError('Username and designation are required');
            return;
        }

        try {
            await api.put(`/users/${editingUser.id}`, {
                username: formData.username,
                designation: formData.designation
            });
            setEditingUser(null);
            setFormData({ username: '', password: '', designation: 'guest' });
            fetchUsers();
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update user');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete user');
        }
    };

    const startEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            designation: user.designation
        });
    };

    const cancelEdit = () => {
        setEditingUser(null);
        setFormData({ username: '', password: '', designation: 'guest' });
        setError('');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (loading) {
        return <div className="loading">Loading users...</div>;
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>User Management</h1>
                <div className="admin-actions">
                    <span className="user-info">
                        Logged in as: {user?.username} ({user?.designation})
                    </span>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                        Dashboard
                    </button>
                    <button onClick={handleLogout} className="btn-secondary">
                        Logout
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="users-section">
                <div className="section-header">
                    <h2>Users</h2>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn-primary"
                    >
                        Add New User
                    </button>
                </div>

                {showCreateForm && (
                    <div className="form-card">
                        <h3>Create New User</h3>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label>Username:</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password:</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Designation:</label>
                                <select
                                    value={formData.designation}
                                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                >
                                    <option value="guest">Guest</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">Create User</button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="users-list">
                    {users.map(user => (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <h4>{user.username}</h4>
                                <span className={`designation ${user.designation}`}>
                                    {user.designation}
                                </span>
                                <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="user-actions">
                                <button
                                    onClick={() => startEdit(user)}
                                    className="btn-secondary"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="btn-danger"
                                    disabled={user.id === user?.id}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Edit User</h3>
                        <form onSubmit={handleUpdateUser}>
                            <div className="form-group">
                                <label>Username:</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Designation:</label>
                                <select
                                    value={formData.designation}
                                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                >
                                    <option value="guest">Guest</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">Update User</button>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminUsers; 