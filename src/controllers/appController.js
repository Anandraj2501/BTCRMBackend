const appService = require('../services/appService');
const ApiResponse = require('../responses/ApiResponse');

class AppController {
    async listApps(req, res, next) {
        try {
            const data = await appService.listApps();
            res.json(ApiResponse.success(null, data));
        } catch (error) { next(error); }
    }

    async getApp(req, res, next) {
        try {
            const data = await appService.getApp(req.params.appId);
            res.json(ApiResponse.success(null, data));
        } catch (error) { next(error); }
    }

    async getAppBundle(req, res, next) {
        try {
            const data = await appService.getAppBundle(req.params.appId);
            res.json(ApiResponse.success(null, data));
        } catch (error) { next(error); }
    }

    async saveDraftApp(req, res, next) {
        try {
            const data = await appService.saveDraftApp(req.body);
            res.status(201).json(ApiResponse.success('App saved successfully.', data));
        } catch (error) { next(error); }
    }

    async publishApp(req, res, next) {
        try {
            const data = await appService.publishApp(req.params.appId);
            res.json(ApiResponse.success('App published successfully.', data));
        } catch (error) { next(error); }
    }

    async deleteApp(req, res, next) {
        try {
            await appService.deleteApp(req.params.appId);
            res.json(ApiResponse.success('App deleted successfully.'));
        } catch (error) { next(error); }
    }
}

module.exports = new AppController();
