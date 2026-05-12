const ApiResponse = require('../responses/ApiResponse');
const solutionService = require('../services/solutionService');

class SolutionController {
    async listSolutions(req, res, next) {
        try {
            const data = await solutionService.listSolutions();
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async createSolution(req, res, next) {
        try {
            const data = await solutionService.createSolution(req.body);
            res.status(201).json(ApiResponse.success('Solution created successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async getSolutionById(req, res, next) {
        try {
            const data = await solutionService.getSolutionById(req.params.id);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async addExistingComponent(req, res, next) {
        try {
            const data = await solutionService.addExistingComponent(req.params.id, req.body);
            res.status(201).json(ApiResponse.success('Existing component added to solution.', data));
        } catch (error) {
            next(error);
        }
    }

    async createComponentAndAdd(req, res, next) {
        try {
            const data = await solutionService.createNewComponentAndAdd(req.params.id, req.body);
            res.status(201).json(ApiResponse.success('New component created and added to solution.', data));
        } catch (error) {
            next(error);
        }
    }

    async removeComponent(req, res, next) {
        try {
            await solutionService.removeComponentFromSolution(req.params.id, req.params.componentId);
            res.json(ApiResponse.success('Component removed from solution.'));
        } catch (error) {
            next(error);
        }
    }

    async deleteSolution(req, res, next) {
        try {
            await solutionService.deleteSolution(req.params.id);
            res.json(ApiResponse.success('Solution deleted successfully.'));
        } catch (error) {
            next(error);
        }
    }

    async listGlobalComponents(req, res, next) {
        try {
            const data = await solutionService.listGlobalComponents(req.query.type);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async deleteGlobalComponent(req, res, next) {
        try {
            await solutionService.deleteComponentGlobally(req.params.componentId);
            res.json(ApiResponse.success('Global component deleted successfully.'));
        } catch (error) {
            next(error);
        }
    }

    async getSolutionsByComponent(req, res, next) {
        try {
            const data = await solutionService.getSolutionsByComponent(req.params.componentId);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SolutionController();
