import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatarColor: { type: String, default: '#6c63ff' },
  avatarUrl: { type: String, default: '' },
  about: { type: String, default: 'Hey there! I am using Chatterly.' }
}, { timestamps: true })
export default mongoose.model('User', userSchema)
