export default {
  async fetch(request, env, ctx) {
    return new Response("AfricSocial Cloudflare Worker 🚀", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=UTF-8",
      },
    });
  },
};
