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
		// We check for internal container names, localhost, and the aliased external domain hitting the internal port
		if (
			host?.includes("app:3000") ||
			host === "localhost:3000" ||
			forwardedHost?.includes("app:3000") ||
			host?.includes("rres.togomol.com:3000") ||
			host === "rres.togomol.com"
		) {
			if (proto !== "https") {
				console.log(`[Nitro Diag] Forcing https protocol for internal request to ${host}`);
				event.node.req.headers["x-forwarded-proto"] = "https";
			}
		}
	});
};
