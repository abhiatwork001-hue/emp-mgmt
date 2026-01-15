import swaggerJsdoc from 'swagger-jsdoc';

export const getApiDocs = async () => {
    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Chick-fil-A Helper API',
                version: '1.0',
                description: 'API Documentation for Store Management System',
            },
            components: {
                securitySchemes: {
                    BearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
            security: [
                {
                    BearerAuth: [],
                },
            ],
        },
        apis: ['./src/app/api/**/*.ts'],
    };

    const spec = swaggerJsdoc(options);
    return spec;
};
