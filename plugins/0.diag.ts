// Nitro diagnostic plugin to intercept and override protocol for internal traffic.
// We use the 'request' hook to capture the event before it reaches the router/middleware.

export default (nitroApp: any) => {
	nitroApp.hooks.hook("request", (event: any) => {
		const host = event.node.req.headers.host;
		const proto = event.node.req.headers["x-forwarded-proto"];
		const forwardedHost = event.node.req.headers["x-forwarded-host"];

		// Log printer requests to help identify where the redirect happens
		if (event.path.includes("/printer/")) {
			console.log(
				`[Nitro Diag] ${event.node.req.method} ${event.path} | Host: ${host} | X-Forwarded-Proto: ${proto} | X-Forwarded-Host: ${forwardedHost}`,
			);
		}

		// Bypass HTTPS redirection for internal traffic
		if (host?.includes("app:3000") || host === "localhost:3000" || forwardedHost?.includes("app:3000")) {
			if (proto !== "https") {
				console.log(`[Nitro Diag] Forcing https protocol for internal request to ${host}`);
				event.node.req.headers["x-forwarded-proto"] = "https";
			}
		}
	});
};
