function compilePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError('Route path must be an absolute path.');
  }

  const names = [];
  const segments = path.split('/').slice(1);
  const pattern = segments.map((segment) => {
    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || names.includes(name)) {
        throw new TypeError(`Invalid route parameter "${segment}".`);
      }
      names.push(name);
      return '([^/]+)';
    }

    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');

  return {
    names,
    regex: new RegExp(`^/${pattern}/?$`),
  };
}

export class Router {
  #routes = [];

  add(method, path, handler) {
    if (typeof method !== 'string' || !/^[A-Za-z]+$/.test(method)) {
      throw new TypeError('Route method must be a valid HTTP method.');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('Route handler must be a function.');
    }

    const compiled = compilePath(path);
    this.#routes.push({
      method: method.toUpperCase(),
      path,
      handler,
      ...compiled,
    });
    return this;
  }

  match(method, pathname) {
    if (typeof method !== 'string' || typeof pathname !== 'string') return null;

    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = route.regex.exec(pathname);
      if (!match) continue;

      let params;
      try {
        params = Object.fromEntries(
          route.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
        );
      } catch {
        return null;
      }

      return { handler: route.handler, params, path: route.path };
    }

    return null;
  }
}
