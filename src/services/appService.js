const appRepository = require('../repositories/appRepository');
const formRepository = require('../repositories/formRepository');
const viewRepository = require('../repositories/viewRepository');

function mapAppMetadataError(error) {
    const message = String(error?.message || '');

    if (
        message.includes("Invalid object name 'AppMetadata'") ||
        message.includes("Invalid column name 'appid'") ||
        message.includes("Invalid column name 'formkey'") ||
        message.includes("Invalid column name 'viewkey'") ||
        message.includes("Invalid column name 'modifiedon'")
    ) {
        return new Error(
            'App metadata tables are not ready. Run BTCRMBackend/database/migrations/005_app_metadata_and_app_scoped_artifacts.sql against MiniCRM, then retry.'
        );
    }

    return error;
}

class AppService {
    async listApps() {
        try {
            return appRepository.listApps();
        } catch (error) {
            throw mapAppMetadataError(error);
        }
    }

    async getApp(appId) {
        try {
            return appRepository.getApp(appId);
        } catch (error) {
            throw mapAppMetadataError(error);
        }
    }

    async getAppBundle(appId) {
        try {
            const app = await appRepository.getApp(appId);
            const appPayload = app?.draft?.payload || app?.published?.payload || null;
            const entities = Array.isArray(appPayload?.entities) ? appPayload.entities : [];
            const forms = await formRepository.getFormsForEntities(entities);
            const views = await viewRepository.getViewsForEntities(entities);
            return { app, forms, views };
        } catch (error) {
            throw mapAppMetadataError(error);
        }
    }

    async saveDraftApp(app) {
        if (!app?.id) throw new Error('app id is required');
        try {
            return appRepository.saveDraftApp(app);
        } catch (error) {
            throw mapAppMetadataError(error);
        }
    }

    async publishApp(appId) {
        try {
            return appRepository.publishApp(appId);
        } catch (error) {
            throw mapAppMetadataError(error);
        }
    }

    async deleteApp(appId) {
        try {
            return appRepository.deleteApp(appId);
        } catch (error) {
            throw mapAppMetadataError(error);
        }
    }
}

module.exports = new AppService();
