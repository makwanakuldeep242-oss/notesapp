import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const EMPTY_FORM = { title: '', description: '', status: 'pending', dueDate: '' };

const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : null);
const isOverdue = (d) => d && new Date(d) < new Date() ;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (sortBy) params.sortBy = sortBy;
      const { data } = await api.get('/tasks', { params });
      setTasks(data);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, sortBy]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, dueDate: form.dueDate || null };
      if (editId) {
        const { data } = await api.put(`/tasks/${editId}`, payload);
        setTasks(tasks.map((t) => (t._id === editId ? data : t)));
        setEditId(null);
      } else {
        const { data } = await api.post('/tasks', payload);
        setTasks([data, ...tasks]);
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task) => {
    setEditId(task._id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch {
      setError('Failed to delete task');
    }
  };

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: newStatus });
      setTasks(tasks.map((t) => (t._id === task._id ? data : t)));
    } catch {
      setError('Failed to update status');
    }
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); };

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar">
        <span className="brand">📋 Smart Tasks</span>
        <div className="nav-right">
          <span className="nav-user">Hi, {user?.name}</span>
          <button onClick={toggle} className="btn-theme" title="Toggle dark mode">
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-body">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-num">{tasks.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-num">{pendingCount}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card completed">
            <span className="stat-num">{completedCount}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>

        {/* Task Form */}
        <div className="task-form-card">
          <h3>{editId ? '✏️ Edit Task' : '➕ Add New Task'}</h3>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <input
              name="title"
              placeholder="Task title *"
              value={form.title}
              onChange={handleChange}
              required
            />
            <textarea
              name="description"
              placeholder="Description (optional)"
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
            <div className="form-row">
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                title="Due date"
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editId ? 'Update Task' : 'Add Task'}
              </button>
              {editId && (
                <button type="button" onClick={cancelEdit} className="btn-cancel">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Search & Filter */}
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="🔍 Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="dueDate">By Due Date</option>
          </select>
        </div>

        {/* Task List */}
        <div className="task-list">
          <h3>Your Tasks ({tasks.length})</h3>
          {loading ? (
            <p className="loading">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="empty">No tasks found.</p>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className={`task-card ${task.status}`}>
                <div className="task-info">
                  <h4 className={task.status === 'completed' ? 'strikethrough' : ''}>
                    {task.title}
                  </h4>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  <div className="task-meta">
                    <span className={`badge ${task.status}`}>{task.status}</span>
                    {task.dueDate && (
                      <span className={`due-date ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'overdue' : ''}`}>
                        📅 {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && task.status !== 'completed' && ' (Overdue)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="task-actions">
                  <button onClick={() => handleToggleStatus(task)} className="btn-toggle">
                    {task.status === 'pending' ? '✓' : '↩'}
                  </button>
                  <button onClick={() => handleEdit(task)} className="btn-edit">Edit</button>
                  <button onClick={() => handleDelete(task._id)} className="btn-delete">Del</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
