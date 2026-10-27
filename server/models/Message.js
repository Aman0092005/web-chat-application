import mongoose from 'mongoose'
const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', trim: true },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  fileName: { type: String, default: '' },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })
export default mongoose.model('Message', messageSchema)
