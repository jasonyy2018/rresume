import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, RequestHeadersPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import router from "@/integrations/orpc/router";
import { getLocale } from "@/utils/locale";

const rpcHandler = new RPCHandler(router, {
	plugins: [new BatchHandlerPlugin(), new RequestHeadersPlugin()],
});

async function handler({ request }: { request: Request }) {
	try {
		const { response } = await rpcHandler.handle(request, {
			prefix: "/api/rpc",
			context: { locale: await getLocale(), reqHeaders: request.headers },
		});

		if (!response) return new Response("NOT_FOUND", { status: 404 });

		return response;
	} catch (error) {
		console.error("[RPC Handler Error]", error);
		return new Response("INTERNAL_SERVER_ERROR", { status: 500 });
	}
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			ANY: handler,
		},
	},
});
