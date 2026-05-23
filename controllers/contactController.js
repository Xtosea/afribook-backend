import User from "../models/User.js";

export const syncContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ message: "Invalid contacts" });
    }

    // 1. Save contacts to user (optional)
    const user = await User.findById(userId);
    user.contacts = contacts;

    // 2. Extract phone numbers
    const phones = contacts.map(c => c.phone).filter(Boolean);

    // 3. Find matching users (FRIENDS ON PLATFORM)
    const matchedUsers = await User.find({
      phone: { $in: phones }
    }).select("name profilePic phone");

    await user.save();

    return res.json({
      message: "Contacts synced successfully",
      matchedUsers, // 👈 THIS is what you show in UI
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};