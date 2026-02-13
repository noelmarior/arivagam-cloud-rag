const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  
  // The "Drive" Logic: Points to its parent folder.
  // If null, it is in the "Home" directory.
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  },
  
  // Breadcrumb path cache (Optional optimization)
  path: [{ name: String, id: String }], 

  createdAt: { type: Date, default: Date.now }
});

// Compound Index: Prevent duplicate folder names inside the same parent
FolderSchema.index({ userId: 1, parentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Folder', FolderSchema);