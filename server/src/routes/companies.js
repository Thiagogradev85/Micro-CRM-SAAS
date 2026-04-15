import { Router }            from 'express'
import { CompanyController } from '../controllers/CompanyController.js'
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)
router.use(requireAdmin)

router.get('/',           CompanyController.list)
router.get('/:id',        CompanyController.get)
router.get('/:id/users',  CompanyController.listUsers)
router.post('/',          CompanyController.create)
router.put('/:id',        CompanyController.update)
router.delete('/:id',     CompanyController.delete)

export default router
