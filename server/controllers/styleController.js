const StyleTemplate = require('../models/StyleTemplate');

// 1. Get All Styles
exports.getStyles = async (req, res) => {
  console.log("🔍 [GET] /styles called by user:", req.auth.userId); // DEBUG LOG
  try {
    const userId = req.auth.userId;
    const styles = await StyleTemplate.find({ userId }).sort({ name: 1 });
    console.log(`✅ Found ${styles.length} styles`); // DEBUG LOG
    res.json(styles);
  } catch (error) {
    console.error("❌ [GET] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Create New Style
exports.createStyle = async (req, res) => {
  console.log("📝 [POST] /styles called"); // DEBUG LOG
  console.log("   Payload:", req.body);   // DEBUG LOG

  try {
    const userId = req.auth.userId;
    const { name, instruction } = req.body;

    if (!name || !instruction) {
      console.error("❌ Missing fields");
      return res.status(400).json({ error: "Name and Instruction are required." });
    }

    const newStyle = new StyleTemplate({ userId, name, instruction });
    
    // Explicitly wait for save
    const savedStyle = await newStyle.save();
    
    console.log("✅ Style Saved to DB:", savedStyle._id); // DEBUG LOG
    res.status(201).json(savedStyle);

  } catch (error) {
    console.error("❌ [POST] Save Failed:", error); // DEBUG LOG
    
    // Check for Duplicate Key Error (MongoDB Code 11000)
    if (error.code === 11000) {
      return res.status(400).json({ error: "A style with this name already exists." });
    }
    res.status(500).json({ error: error.message });
  }
};

// 3. Delete Style
exports.deleteStyle = async (req, res) => {
  console.log(`🗑️ [DELETE] /styles/${req.params.id} called`); // DEBUG LOG
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    await StyleTemplate.findOneAndDelete({ _id: id, userId });
    console.log("✅ Style Deleted");
    res.json({ message: "Style deleted" });
  } catch (error) {
    console.error("❌ [DELETE] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};