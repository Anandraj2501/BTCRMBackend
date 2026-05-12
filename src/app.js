require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const errorMiddleware = require('./middleware/errorMiddleware');
const { ensureAppMetadataSchema } = require('./bootstrap/ensureAppMetadataSchema');
const { ensureSolutionSchema } = require('./bootstrap/ensureSolutionSchema');
const { ensureSalesModuleSchema } = require('./bootstrap/ensureSalesModuleSchema');
const { ensureServiceCrmMetadata } = require('./bootstrap/ensureServiceCrmMetadata');
const { requestContextMiddleware } = require('./middleware/requestContextMiddleware');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(requestContextMiddleware);

// Routes
const metadataRoutes = require('./routes/metadataRoutes');
const entityRoutes = require('./routes/entityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const appRoutes = require('./routes/appRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const recordRoutes = require('./routes/recordRoutes');
const accountRoutes = require('./routes/accountRoutes');
const contactRoutes = require('./routes/contactRoutes');
const caseRoutes = require('./routes/caseRoutes');
const slaRoutes = require('./routes/slaRoutes');
const { startSlaBreachJob } = require('./jobs/slaBreachJob');

app.use('/api/metadata', metadataRoutes);
app.use('/api/entity', entityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/app', appRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api', slaRoutes);

app.use('/accounts', accountRoutes);
app.use('/records', recordRoutes);
app.use('/contacts', contactRoutes);
app.use('/cases', caseRoutes);
app.use('/', slaRoutes);

// Global Error Handler
app.use(errorMiddleware);

async function start() {
    try {
        await ensureAppMetadataSchema();
        await ensureSolutionSchema();
        await ensureSalesModuleSchema();
        await ensureServiceCrmMetadata();
        startSlaBreachJob();

        app.listen(port, () => {
            console.log(`CRM Platform Engine running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to initialize backend startup prerequisites:', error);
        process.exit(1);
    }
}

start();
