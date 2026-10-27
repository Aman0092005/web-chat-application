import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import { createServer } from 'http'
import { Server } from 'socket.io'
import User from './models/User.js'
import Chat from './models/Chat.js'
import Message from './models/Message.js'
import { auth, makeToken } from './auth.js'

const app = express(), httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: 'http://localhost:5173' } })
app.use(cors()); app.use(express.json()); app.use('/uploads', express.static('uploads'))
const storage = multer.diskStorage({ destination: 'uploads', filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`) })
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })
const populatedChat = q => q.populate('members', 'name email avatarColor avatarUrl about').populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name' } })

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Name, email and a 6-character password are required.' })
    if (await User.findOne({ email })) return res.status(409).json({ message: 'That email is already registered.' })
    const colors = ['#665cf6','#ec6677','#ea9a4f','#24a88d','#3689e6','#9a63d7']
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), avatarColor: colors[Math.floor(Math.random()*colors.length)] })
    const safeUser = user.toObject(); delete safeUser.password
    res.status(201).json({ token: makeToken(user._id), user: safeUser })
  } catch { res.status(500).json({ message: 'Could not create your account.' }) }
})
app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() })
  if (!user || !await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).json({ message: 'Incorrect email or password.' })
  const safeUser = user.toObject(); delete safeUser.password
  res.json({ token: makeToken(user._id), user: safeUser })
})
app.get('/api/auth/me', auth, async (req,res) => res.json(await User.findById(req.userId).select('-password')))
app.put('/api/profile', auth, async (req, res) => {
  const { name, about, avatarUrl } = req.body
  if (!name?.trim()) return res.status(400).json({ message: 'Your display name is required.' })
  const user = await User.findByIdAndUpdate(req.userId, { name: name.trim(), about: (about || '').trim(), avatarUrl: avatarUrl || '' }, { new: true }).select('-password')
  res.json(user)
})
app.post('/api/uploads', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a file to upload.' })
  res.status(201).json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype, name: req.file.originalname })
})
app.get('/api/users', auth, async (req,res) => {
  const search = req.query.search || ''
  res.json(await User.find({ _id: { $ne: req.userId }, $or: [{name: new RegExp(search,'i')}, {email: new RegExp(search,'i')}] }).select('-password').limit(30))
})
app.get('/api/chats', auth, async (req,res) => {
  const chats = await populatedChat(Chat.find({ members: req.userId }).sort({ updatedAt: -1 }))
  res.json(chats)
})
app.post('/api/chats/direct', auth, async (req,res) => {
  const other = req.body.userId
  let chat = await Chat.findOne({ isGroup: false, members: { $all: [req.userId, other], $size: 2 } })
  if (!chat) chat = await Chat.create({ members: [req.userId, other] })
  chat = await populatedChat(Chat.findById(chat._id)); res.json(chat)
})
app.post('/api/chats/group', auth, async (req,res) => {
  const { name, memberIds = [] } = req.body
  if (!name || memberIds.length < 1) return res.status(400).json({ message: 'Choose a group name and at least one person.' })
  const ids = [...new Set([req.userId, ...memberIds])]
  let chat = await Chat.create({ isGroup: true, name, members: ids, admins: [req.userId] })
  chat = await populatedChat(Chat.findById(chat._id)); ids.forEach(id => io.to(String(id)).emit('chat:new', chat)); res.status(201).json(chat)
})
app.get('/api/chats/:id/messages', auth, async (req,res) => {
  const allowed = await Chat.exists({ _id: req.params.id, members: req.userId }); if (!allowed) return res.sendStatus(403)
  res.json(await Message.find({ chat: req.params.id }).populate('sender','name avatarColor avatarUrl').sort({ createdAt: 1 }))
})
io.on('connection', socket => {
  socket.on('user:join', id => socket.join(String(id)))
  socket.on('message:send', async ({ chatId, text = '', senderId, mediaUrl = '', mediaType = '', fileName = '' }) => {
    if ((!text.trim() && !mediaUrl) || !await Chat.exists({ _id: chatId, members: senderId })) return
    const message = await Message.create({ chat: chatId, sender: senderId, text: text.trim(), mediaUrl, mediaType, fileName, readBy: [senderId] })
    await message.populate('sender', 'name avatarColor avatarUrl')
    const chat = await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id }, { new: true }); await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() })
    chat.members.forEach(id => io.to(String(id)).emit('message:new', message))
  })
  socket.on('typing', ({ chatId, senderId, active }) => socket.broadcast.emit('typing', { chatId, senderId, active }))
})
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatterly').then(() => {
  httpServer.listen(process.env.PORT || 5000, () => console.log('API running on http://localhost:5000'))
}).catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1) })
