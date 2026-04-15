require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const errorMiddleware = require('./middleware/errorMiddleware');
const { ensureAppMetadataSchema } = require('./bootstrap/ensureAppMetadataSchema');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
const metadataRoutes = require('./routes/metadataRoutes');
const entityRoutes = require('./routes/entityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const appRoutes = require('./routes/appRoutes');

app.use('/api/metadata', metadataRoutes);
app.use('/api/entity', entityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/app', appRoutes);

// Global Error Handler
app.use(errorMiddleware);

async function start() {
    try {
        await ensureAppMetadataSchema();

        app.listen(port, () => {
            console.log(`CRM Platform Engine running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to initialize backend startup prerequisites:', error);
        process.exit(1);
    }
}

start();
