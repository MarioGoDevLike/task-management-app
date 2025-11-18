const mongoose = require('mongoose');

const taskHistorySchema = new mongoose.Schema({
  action: { type: String, required: true }, // created, updated, archived, restored
  timestamp: { type: Date, default: Date.now },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changes: { type: Object }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  history: [taskHistorySchema]
}, {
  timestamps: true
});

// Index for better query performance
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, priority: 1 });
taskSchema.index({ createdAt: -1 }); // For admin dashboard sorting
taskSchema.index({ status: 1, createdAt: -1 }); // Compound index for common queries
taskSchema.index({ priority: 1, createdAt: -1 }); // Compound index for priority sorting

// Virtual for task age
taskSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Pre-save middleware to set completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  } else if (this.isModified('status') && this.status !== 'completed') {
    this.completedAt = null;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
