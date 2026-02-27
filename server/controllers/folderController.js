const Folder = require('../models/Folder');
const File = require('../models/File');

// 1. Create a New Folder
exports.createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const userId = req.auth.userId;

    const newFolder = new Folder({
      name,
      parentId: parentId || null,
      userId
    });

    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A folder with this name already exists here.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// 2. Get Folder Contents (Subfolders + Files)
// 2. Get Folder Contents (Subfolders + Files)
exports.getFolderContents = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.auth.userId;

    console.log(`📂 Fetching contents for folder: ${folderId}`); // ✅ Debug log

    const parentIdFilter = folderId === 'root' ? null : folderId;

    // A. Fetch Subfolders
    const folders = await Folder.find({
      userId,
      parentId: parentIdFilter
    }).sort({ name: 1 });

    // B. Fetch Files
    const files = await File.find({
      userId,
      folderId: parentIdFilter
    })
      .select('-content')
      .sort({ fileName: 1 });

    // --- AUTO-CORRECT STUCK PROCESSING FILES ---
    // If a file has been "processing" for more than 10 minutes, assuming the server restarted or crashed.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    let filesUpdated = false;

    for (let file of files) {
      if (file.status === 'processing' && file.createdAt < tenMinutesAgo) {
        // Auto-correct to failed (or completed if it has a summary/vectors but we can't easily check vectors here). 
        // We will default to failed so the user knows to re-upload.
        // Actually, if it has a pineconeId or summary, it might have finished but failed to save status.
        // Let's check summary. If it has a summary, it likely finished.
        const fileFull = await File.findById(file._id).select('summary');

        file.status = fileFull?.summary ? 'completed' : 'failed';
        file.errorMessage = fileFull?.summary ? null : 'Processing timed out. Please delete and re-upload.';

        await File.updateOne(
          { _id: file._id },
          { $set: { status: file.status, errorMessage: file.errorMessage } }
        );
        filesUpdated = true;
      }
    }

    // C. Get Current Folder Details ✅ FIXED
    let currentFolder = null;
    if (folderId !== 'root') {
      currentFolder = await Folder.findOne({
        _id: folderId,
        userId // ✅ IMPORTANT: Verify ownership
      });

      if (!currentFolder) {
        console.error(`❌ Folder not found: ${folderId}`);
        return res.status(404).json({ error: 'Folder not found' });
      }

      console.log(`✅ Current folder:`, currentFolder); // ✅ Debug log
    }

    res.json({
      folder: currentFolder,    // ✅ Changed from 'currentFolder' to 'folder'
      folders,
      files
    });
  } catch (error) {
    console.error('getFolderContents error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Folder (Rename) ✅ NEW
exports.updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.auth.userId;

    // Find and verify ownership
    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Update name
    folder.name = name;
    await folder.save();

    res.json(folder);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A folder with this name already exists here.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete Folder ✅ NEW
exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    // Find and verify ownership
    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Delete the folder
    await Folder.deleteOne({ _id: id });

    // Optional: Also delete all files inside this folder
    await File.deleteMany({ folderId: id, userId });

    // Optional: Also delete all subfolders (recursive delete)
    const subfolders = await Folder.find({ parentId: id, userId });
    for (const subfolder of subfolders) {
      await Folder.deleteOne({ _id: subfolder._id });
      await File.deleteMany({ folderId: subfolder._id, userId });
    }

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};