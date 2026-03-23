import { Router } from 'express'
import multer from 'multer'
import { CatalogController } from '../controllers/CatalogController.js'

const upload = multer({ storage: multer.memoryStorage() })
const router = Router()

// Catálogos
router.get('/',    CatalogController.list)
router.get('/:id', CatalogController.get)
router.post('/',   CatalogController.create)
router.put('/:id', CatalogController.update)
router.delete('/:id', CatalogController.delete)

// Importação de produtos via PDF (deve vir antes de /:id/products)
router.post('/:id/import-pdf', upload.single('file'), CatalogController.importPdf)

// Produtos do catálogo
router.get('/:id/products',                          CatalogController.listProducts)
router.post('/:id/products',                         CatalogController.createProduct)
router.post('/:id/products/link',                    CatalogController.addProduct)
router.get('/:id/products/:prodId',                  CatalogController.getProduct)
router.put('/:id/products/:prodId',                  CatalogController.updateProduct)
router.patch('/:id/products/:prodId/stock',          CatalogController.updateStock)
router.delete('/:id/products/:prodId',               CatalogController.deleteProduct)
router.delete('/:id/products/:prodId/unlink',        CatalogController.removeProduct)

// Catalog PDF
router.get('/:id/pdf',                               CatalogController.catalogPdf)

export default router
