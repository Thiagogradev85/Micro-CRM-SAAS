import { Router } from 'express'
import { authSettings, getSettings, saveSettings, testSetting } from '../controllers/SettingsController.js'

const router = Router()

router.post('/auth',  authSettings)
router.get('/',       getSettings)
router.post('/',      saveSettings)
router.post('/test',  testSetting)

export default router
