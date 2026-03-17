require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Routes
const metadataRoutes = require('./routes/metadataRoutes');
const entityRoutes = require('./routes/entityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/metadata', metadataRoutes);
app.use('/api/entity', entityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global Error Handler
app.use(errorMiddleware);

app.listen(port, () => {
    console.log(`CRM Platform Engine running on port ${port}`);
});
