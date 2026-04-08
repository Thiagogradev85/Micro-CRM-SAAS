import { Router } from 'express'
import multer from 'multer'
import { EmailController } from '../controllers/EmailController.js'

const router = Router()

// Aceita arquivo opcional de até 15 MB (PDF, imagem) como anexo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
})

router.get('/status',       EmailController.status)
router.post('/configure',   EmailController.configure)
router.post('/disconnect',  EmailController.disconnect)
router.get('/preview',      EmailController.preview)
router.post('/send-test',   upload.single('attachment'), EmailController.sendTest)
router.post('/send-bulk',   upload.single('attachment'), EmailController.sendBulk)

export default router
