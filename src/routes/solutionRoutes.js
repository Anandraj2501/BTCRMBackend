const express = require('express');
const solutionController = require('../controllers/solutionController');

const router = express.Router();

router.get('/', solutionController.listSolutions);
router.post('/', solutionController.createSolution);
router.get('/components/global', solutionController.listGlobalComponents);
router.get('/components/:componentId/solutions', solutionController.getSolutionsByComponent);
router.delete('/components/global/:componentId', solutionController.deleteGlobalComponent);
router.get('/:id', solutionController.getSolutionById);
router.post('/:id/components/existing', solutionController.addExistingComponent);
router.post('/:id/components/new', solutionController.createComponentAndAdd);
router.delete('/:id/components/:componentId', solutionController.removeComponent);
router.delete('/:id', solutionController.deleteSolution);

module.exports = router;
