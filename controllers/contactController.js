import User from "../models/User.js";

export const syncContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ message: "Invalid contacts" });
    }

    const user = await User.findById(userId);

    user.contacts = contacts; // store raw contacts (optional)

    await user.save();

    res.json({
      message: "Contacts synced successfully",
      count: contacts.length,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};