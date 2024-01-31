function doesRouteMatch(req, patterns) {
    for (let pattern of patterns) {
        const [method, routePattern] = pattern.split(' ');

        // Convert route pattern to a regular expression
        const regex = new RegExp('^' + routePattern.replace(/:[^\s/]+/g, '([^/]+)') + '$');

        if ((req.method === method.toUpperCase() || req.method === 'OPTIONS' )&& regex.test(req.path)) {
            return true;
        }
    }
    return false;
}


module.exports = doesRouteMatch;