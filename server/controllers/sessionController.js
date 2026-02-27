const Session = require('../models/Session');
const File = require('../models/File');
const Folder = require('../models/Folder');
const aiService = require('../services/aiService');

// 1. Get All Sessions (Active or Archived)
exports.getSessions = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const isArchived = req.query.archived === 'true';

    // Ensure we sort by latest first
    const sessions = await Session.find({
      userId,
      isArchived: isArchived ? true : { $ne: true }
    })
      .sort({ lastActive: -1 })
      .select('name lastActive isPinned isArchived createdAt'); // Fetch fields needed for sorting

    // ALWAYS return an array, even if empty
    res.json(sessions || []);
  } catch (error) {
    console.error("Session Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// 2. Get Single Session (SAFE MODE)
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    try {
      const session = await Session.findOne({ _id: id, userId })
        .populate({
          path: 'sourceFiles',
          select: 'fileName folderId',
          populate: { path: 'folderId', select: 'name' }
        });

      if (!session) throw new Error("Session not found");
      return res.json(session);

    } catch (deepError) {
      console.warn("⚠️ Folder link broken. Switching to Safe Mode.");

      // --- ATTEMPT 2: Safe Mode (Files Only, No Folders) ---
      // This runs if the data is "poisoned"
      const session = await Session.findOne({ _id: id, userId })
        .populate('sourceFiles', 'fileName'); // Just get file names

      if (!session) return res.status(404).json({ error: 'Session not found' });
      return res.json(session);
    }

  } catch (error) {
    console.error("Critical Session Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Session Name
exports.updateSessionName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.auth.userId;

    const session = await Session.findOneAndUpdate(
      { _id: id, userId },
      { name },
      { new: true }
    );
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Toggle Pin
exports.togglePinSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body; // Expects true/false
    const userId = req.auth.userId;
    const session = await Session.findOneAndUpdate(
      { _id: id, userId },
      { isPinned },
      { new: true }
    );
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Archive
exports.toggleArchiveSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived } = req.body; // Expects true/false
    const userId = req.auth.userId;
    const session = await Session.findOneAndUpdate(
      { _id: id, userId },
      { isArchived },
      { new: true }
    );
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search Sessions
exports.searchSessions = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.auth.userId;

    if (!q) {
      return res.json([]);
    }

    const sessions = await Session.find({
      userId,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { "messages.content": { $regex: q, $options: 'i' } }
      ]
    })
      .sort({ lastActive: -1 })
      .select('name lastActive isPinned isArchived createdAt');

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Add Sources to Session & Update Summary
exports.addSourcesToSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileIds } = req.body;
    const userId = req.auth.userId;

    // 1. Fetch Session
    const session = await Session.findOne({ _id: id, userId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    // 2. Add New Files (Avoid Duplicates)
    // We strictly update the reference array so the "Context" changes for the next Q&A
    const currentIds = session.sourceFiles.map(sf => sf.toString());
    const newUniqueIds = fileIds.filter(fid => !currentIds.includes(fid));

    if (newUniqueIds.length === 0) return res.json(session); // Nothing to add

    session.sourceFiles.push(...newUniqueIds);

    // 3. SKIP RE-SUMMARIZATION
    // We just save the new file links. The next time the user chats, 
    // the chat controller will pull these new files automatically.
    await session.save();

    // 4. Return Updated Session (Deep Populated for UI Sidebar)
    const updatedSession = await Session.findById(id)
      .populate({
        path: 'sourceFiles',
        select: 'fileName folderId',
        populate: { path: 'folderId', select: 'name' }
      });

    res.json(updatedSession);

  } catch (error) {
    console.error("Add Source Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Clear Session Messages
exports.clearSessionMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const session = await Session.findOneAndUpdate(
      { _id: id, userId },
      { messages: [] },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ message: "Chat cleared successfully", session });
  } catch (error) {
    console.error("Clear Session Error:", error);
    res.status(500).json({ error: "Failed to clear chat" });
  }
};

// 6. Delete Session
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;
    await Session.findOneAndDelete({ _id: id, userId });
    res.json({ message: "Session deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};