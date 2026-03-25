import { Router } from 'express'
import { WhatsAppController } from '../controllers/WhatsAppController.js'

const router = Router()

router.get('/status',      WhatsAppController.status)
router.post('/connect',    WhatsAppController.connect)
router.post('/disconnect', WhatsAppController.disconnect)
router.get('/preview',     WhatsAppController.preview)
router.post('/send-bulk',  WhatsAppController.sendBulk)

export default router
