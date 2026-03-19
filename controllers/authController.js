import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
try {

const { name, email, password } = req.body;

const userExists = await User.findOne({ email });
if (userExists)
return res.status(400).json({ message: "User already exists" });

const hashedPassword = await bcrypt.hash(password, 10);

const user = await User.create({
name,
email,
password: hashedPassword
});

const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

res.json({ user, token });

} catch (error) {
res.status(500).json({ error: error.message });
}
};

export const login = async (req, res) => {
try {

const { email, password } = req.body;

const user = await User.findOne({ email });
if (!user) return res.status(400).json({ message: "User not found" });

const match = await bcrypt.compare(password, user.password);
if (!match) return res.status(400).json({ message: "Wrong password" });

const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

res.json({ user, token });

} catch (error) {
res.status(500).json({ error: error.message });
}
};