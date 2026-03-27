import { Router } from 'express'
import { ProspectingController } from '../controllers/ProspectingController.js'

const router = Router()

router.post('/search', ProspectingController.search)
router.post('/save',   ProspectingController.save)

export default router
