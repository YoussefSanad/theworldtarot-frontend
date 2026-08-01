export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/") {
      return new Response(null, { status: 200, headers: { "content-type": "text/html" } });
    }

    return new Response("Not Found", { status: 404, headers: { "content-type": "text/plain" } });
  },
};
