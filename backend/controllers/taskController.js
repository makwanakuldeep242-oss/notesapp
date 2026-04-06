const Task = require('../models/Task');

// GET /api/tasks?search=&status=&sortBy=
const getTasks = async (req, res, next) => {
  try {
    const { search, status, sortBy } = req.query;
    const filter = { userId: req.user._id };

    if (status && ['pending', 'completed'].includes(status)) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      dueDate: { dueDate: 1 },
    };
    const sort = sortOptions[sortBy] || { createdAt: -1 };

    const tasks = await Task.find(filter).sort(sort);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, dueDate } = req.body;
    const task = await Task.create({
      title, description, status, dueDate: dueDate || null,
      userId: req.user._id,
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { title, description, status, dueDate } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate || null;

    await task.save();
    res.json(task);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
