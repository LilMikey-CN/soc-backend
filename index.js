require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Care Management API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
console.log('Loading users route...');
try {
  const usersRouter = require('./routes/users');
  console.log('Users router type:', typeof usersRouter);
  console.log('Users router stack length:', usersRouter.stack ? usersRouter.stack.length : 'no stack');
  app.use('/api/users', usersRouter);
  console.log('✅ Users route loaded successfully');
} catch (error) {
  console.error('❌ Error loading users route:', error);
}
app.use('/api/care-items', require('./routes/careItems'));
app.use('/api/care-tasks', require('./routes/careTasks'));
app.use('/api/client-profiles', require('./routes/clientProfiles'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/task-executions', require('./routes/taskExecutions'));
app.use('/api/simple-test', require('./routes/simple-test'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 handler hit for:', req.method, req.path);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;