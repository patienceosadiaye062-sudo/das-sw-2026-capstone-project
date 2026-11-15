import { requireUser } from '../http/guards.js';

export function registerAuthRoutes(router, { authService, tokenSecret }) {
  router.add('POST', '/api/auth/signup', async ({ body }) => ({
    status: 201,
    body: await authService.signup(body),
  }));
  router.add('POST', '/api/auth/login', async ({ body }) => ({
    status: 200,
    body: await authService.login(body),
  }));
  router.add('GET', '/api/auth/me', async ({ request }) => {
    const user = requireUser(request, tokenSecret);
    return { status: 200, body: await authService.getUser(user.sub) };
  });
  return router;
}
