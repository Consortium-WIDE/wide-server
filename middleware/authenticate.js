function isAuthenticated(req, res, next) {
    const sessionCookie = req.cookies['session_id'];
    if (!sessionCookie) {
        console.error('Unauthorized: No session cookie');
        return res.status(401).send('Unauthorized: No session cookie');
    }

    try {
        const session = JSON.parse(sessionCookie);
        const currentTime = new Date().getTime();

        // Check if the session has expired
        if (session.expires && currentTime > session.expires) {
            console.error('Unauthorized: Session expired');
            return res.status(401).send('Unauthorized: Session expired');
        }

        req.user = session.user; // Make user data available in the request
        next();
    } catch (error) {
        console.error('Unauthorized: Invalid session');
        return res.status(401).send('Unauthorized: Invalid session');
    }
}

module.exports = isAuthenticated;
