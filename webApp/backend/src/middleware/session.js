import session from 'express-session';

export function setupMiddleware(app) {
    app.use(session({
        secret: 'your-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));
}