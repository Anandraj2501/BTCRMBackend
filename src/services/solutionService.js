const NotFoundException = require('../exceptions/NotFoundException');
const ValidationException = require('../exceptions/ValidationException');
const solutionRepository = require('../repositories/solutionRepository');
const appRepository = require('../repositories/appRepository');
const metadataRepository = require('../repositories/metadataRepository');
const metadataService = require('./metadataService');
const { randomUUID } = require('crypto');

function normalizeUniqueName(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '');
}

function toLogicalName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

function typeToObjectType(type) {
    const normalized = String(type || '').toLowerCase();
    switch (normalized) {
        case 'app': return 'apps';
        case 'table': return 'tables';
        case 'form': return 'forms';
        case 'view': return 'views';
        case 'cloud flow': return 'cloud-flows';
        case 'site map': return 'site-maps';
        case 'agent': return 'agents';
        case 'card': return 'cards';
        case 'data workspace': return 'data-workspaces';
        default: return 'all';
    }
}

function createSolutionSummary(solution, componentCount = 0) {
    return {
        ...solution,
        name: solution.uniqueName,
        created: new Date(solution.createdOn).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }),
        managedType: solution.isManaged ? 'managed' : 'unmanaged',
        solutionCheck: 'Hasn\'t been run',
        sourceControlStatus: 'Not connected to Git',
        componentCount,
    };
}

function normalizeComponent(component, mapping = null) {
    const metadata = component.metadata || {};
    return {
        id: component.id,
        componentId: component.id,
        displayName: component.name,
        name: component.logicalName || toLogicalName(component.name),
        logicalName: component.logicalName || toLogicalName(component.name),
        type: component.type,
        objectType: typeToObjectType(component.type),
        addedOn: mapping?.addedOn || component.createdOn,
        isExisting: mapping?.isExisting ?? true,
        owner: metadata.owner || 'System',
        status: metadata.status || 'Draft',
        customized: metadata.customized || 'No',
        lastModified: metadata.lastModified || component.createdOn,
        managed: metadata.managed || 'No',
        usedInSolutions: metadata.usedInSolutions || 0,
    };
}

function mapArtifactToAppComponent(artifact) {
    const payload = artifact?.draft?.payload || artifact?.published?.payload;
    if (!payload?.id) return null;

    return {
        id: payload.id,
        type: 'App',
        name: payload.name || 'Untitled App',
        logicalName: toLogicalName(payload.name || payload.id),
        metadata: {
            owner: payload.owner || 'Admin',
            status: artifact?.published ? 'Published' : 'Draft',
            customized: 'Yes',
            managed: 'No',
            lastModified: payload.modifiedOn || payload.createdOn || new Date().toISOString(),
            source: 'AppMetadata',
        },
    };
}

function mapEntityToComponent(entity) {
    return {
        id: entity.entityid,
        type: 'Table',
        name: entity.displayname || entity.logicalname,
        logicalName: entity.logicalname,
        metadata: {
            owner: 'System',
            status: entity.iscustomentity ? 'Custom' : 'Standard',
            customized: entity.iscustomentity ? 'Yes' : 'No',
            managed: 'No',
            lastModified: entity.modifiedon || entity.createdon || new Date().toISOString(),
            source: 'EntityMetadata',
        },
    };
}

function createDraftAppPayload(name) {
    const id = randomUUID();
    const now = new Date().toISOString();
    return {
        id,
        name,
        description: '',
        type: 'Model-driven',
        owner: 'Admin',
        draftVersion: 1,
        publishedVersion: 0,
        commandBars: {},
        security: { roleIds: [] },
        sitemap: [],
        entities: [],
        createdOn: now,
        modifiedOn: now,
        status: 'Draft',
    };
}

class SolutionService {
    async listSolutions() {
        const solutions = await solutionRepository.listSolutions();
        return solutions.map((solution) => createSolutionSummary(solution, solution.componentCount || 0));
    }

    async listGlobalComponents(type = null) {
        const components = await solutionRepository.listComponents(type);
        return components.map((component) => normalizeComponent(component));
    }

    async getSolutionById(solutionId) {
        const solution = await solutionRepository.getSolution(solutionId);
        if (!solution) {
            throw new NotFoundException('Solution not found.');
        }

        const mappings = await solutionRepository.getSolutionComponents(solutionId);
        return {
            ...createSolutionSummary(solution, mappings.length),
            components: mappings.map((mapping) => normalizeComponent(mapping.component, mapping)),
        };
    }

    async createSolution(input) {
        const displayName = String(input?.displayName || '').trim();
        const uniqueName = normalizeUniqueName(input?.uniqueName || displayName);

        if (!displayName) {
            throw new ValidationException('displayName is required.');
        }

        if (!uniqueName) {
            throw new ValidationException('uniqueName is required.');
        }

        const duplicate = await solutionRepository.getSolutionByUniqueName(uniqueName);
        if (duplicate) {
            throw new ValidationException(`Solution uniqueName '${uniqueName}' already exists.`);
        }

        return solutionRepository.createSolution({
            displayName,
            uniqueName,
            version: input?.version,
            publisher: input?.publisher,
            isManaged: input?.isManaged,
        });
    }

    async addExistingComponent(solutionId, input) {
        const solution = await solutionRepository.getSolution(solutionId);
        if (!solution) {
            throw new NotFoundException('Solution not found.');
        }

        const componentId = String(input?.componentId || '').trim();
        if (!componentId) {
            throw new ValidationException('componentId is required.');
        }

        const component = await solutionRepository.getComponent(componentId);
        if (!component) {
            throw new NotFoundException('Component not found.');
        }

        const exists = await solutionRepository.solutionHasComponent(solutionId, componentId);
        if (exists) {
            throw new ValidationException('Component already exists in this solution.');
        }

        await solutionRepository.addComponentReference(solutionId, {
            componentId,
            type: input?.type || component.type,
            isExisting: true,
            addedOn: new Date().toISOString(),
        });
        return this.getSolutionById(solutionId);
    }

    async createNewComponentAndAdd(solutionId, input) {
        const solution = await solutionRepository.getSolution(solutionId);
        if (!solution) {
            throw new NotFoundException('Solution not found.');
        }

        const type = String(input?.type || '').trim();
        const name = String(input?.name || '').trim();

        if (!type) {
            throw new ValidationException('type is required.');
        }

        if (!name) {
            throw new ValidationException('name is required.');
        }

        let component;

        if (type === 'App') {
            const app = createDraftAppPayload(name);
            await appRepository.saveDraftApp(app);
            component = mapArtifactToAppComponent({ draft: { payload: app } });
        } else if (type === 'Table') {
            const logicalName = toLogicalName(name);
            await metadataService.createEntity({
                logicalname: logicalName,
                displayname: name,
                schemaname: name.replace(/[^a-zA-Z0-9]/g, ''),
                primaryidattribute: `${logicalName}id`,
                primarynameattribute: `${logicalName}name`,
                isactivity: false,
            });
            const entity = await metadataRepository.getEntityMetadata(logicalName);
            component = mapEntityToComponent(entity);
        } else {
            throw new ValidationException('Creating new components is currently supported for App and Table only.');
        }

        await solutionRepository.upsertComponent(component);
        await solutionRepository.addComponentReference(solutionId, {
            componentId: component.id,
            type: component.type,
            isExisting: false,
            addedOn: new Date().toISOString(),
        });
        return this.getSolutionById(solutionId);
    }

    async removeComponentFromSolution(solutionId, componentId) {
        const solution = await solutionRepository.getSolution(solutionId);
        if (!solution) {
            throw new NotFoundException('Solution not found.');
        }

        const removed = await solutionRepository.removeComponentReference(solutionId, componentId);
        if (!removed) {
            throw new NotFoundException('Solution component reference not found.');
        }
    }

    async deleteSolution(solutionId) {
        const deleted = await solutionRepository.deleteSolution(solutionId);
        if (!deleted) {
            throw new NotFoundException('Solution not found.');
        }
    }

    async deleteComponentGlobally(componentId) {
        const deleted = await solutionRepository.deleteComponentGlobally(componentId);
        if (!deleted) {
            throw new NotFoundException('Component not found.');
        }
    }

    async getSolutionsByComponent(componentId) {
        return solutionRepository.getSolutionsByComponent(componentId);
    }
}

module.exports = new SolutionService();
