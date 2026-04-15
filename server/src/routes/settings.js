import { Router } from 'express'
import { getSettings, saveSettings, testSetting, revealSetting } from '../controllers/SettingsController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)

router.get('/',        getSettings)
router.post('/',       saveSettings)
router.post('/test',   testSetting)
router.post('/reveal', revealSetting)

export default router
