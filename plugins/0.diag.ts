export default (nitroApp: any) => {
	// Use a middleware at the very beginning of the stack
	nitroApp.h3App.use((event: any) => {
		const host = event.node.req.headers.host;
		const proto = event.node.req.headers["x-forwarded-proto"];
		const forwardedHost = event.node.req.headers["x-forwarded-host"];

		// Log printer requests to help identify where the redirect happens
		if (event.path.includes("/printer/")) {
			console.log(
				`[Nitro Diag] ${event.node.req.method} ${event.path} | Host: ${host} | X-Forwarded-Proto: ${proto} | X-Forwarded-Host: ${forwardedHost}`,
			);
		}

		// Attempt to bypass the redirect for internal traffic by convincing Nitro/Better Auth
		// that the request is already secure.
		if (host?.includes("app:3000") || host === "localhost:3000" || forwardedHost?.includes("app:3000")) {
			// Set the protocol to https in the event's headers if it's missing or http
			if (proto !== "https") {
				console.log(`[Nitro Diag] Forcing https protocol for internal request to ${host}`);
				event.node.req.headers["x-forwarded-proto"] = "https";
			}
		}
	});
};
