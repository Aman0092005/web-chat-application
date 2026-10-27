import jwt from 'jsonwebtoken'
export const makeToken = id => jwt.sign({ id }, process.env.JWT_SECRET || 'college-project-secret', { expiresIn: '30d' })
export const auth = (req, res, next) => {
  try { req.userId = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET || 'college-project-secret').id; next() }
  catch { res.status(401).json({ message: 'Please sign in again.' }) }
}
