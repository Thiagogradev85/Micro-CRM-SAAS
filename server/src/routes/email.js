import { Router } from 'express'
import { EmailController } from '../controllers/EmailController.js'

const router = Router()

router.get('/status',       EmailController.status)
router.post('/configure',   EmailController.configure)
router.post('/disconnect',  EmailController.disconnect)
router.get('/preview',      EmailController.preview)
router.post('/send-test',   EmailController.sendTest)
router.post('/send-bulk',   EmailController.sendBulk)

export default router
