import { Router } from 'express'
import { WhatsAppController } from '../controllers/WhatsAppController.js'

const router = Router()

router.get('/status',         WhatsAppController.status)
router.post('/connect',       WhatsAppController.connect)
router.post('/disconnect',    WhatsAppController.disconnect)
router.post('/clear-session', WhatsAppController.clearSession)
router.get('/preview',          WhatsAppController.preview)
router.post('/send-bulk',       WhatsAppController.sendBulk)
router.get('/progress',         WhatsAppController.progress)
router.post('/progress/clear',  WhatsAppController.progressClear)

export default router
