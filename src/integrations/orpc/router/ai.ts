import { ORPCError } from "@orpc/server";
import { AISDKError } from "ai";
import z, { ZodError } from "zod";
import { protectedProcedure } from "../context";
import {
	aiCredentialsSchema,
	aiProviderSchema,
	aiService,
	fileInputSchema,
	formatZodError,
	improveContentSchema,
} from "../services/ai";

export const aiRouter = {
	testConnection: protectedProcedure
		.input(
			z.object({
				provider: aiProviderSchema,
				model: z.string(),
				apiKey: z.string(),
				baseURL: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.testConnection(input);
			} catch (error) {
				console.error("[AI Test Connection Error]", error);
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", { message: error.message });
				}

				throw error;
			}
		}),

	parsePdf: protectedProcedure
		.input(
			z.object({
				...aiCredentialsSchema.shape,
				file: fileInputSchema,
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.parsePdf(input);
			} catch (error) {
				console.error("[AI Parse PDF Error]", error);
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", {
						message: `AI Provider Error: ${error.message}`,
						data: { originalError: error },
					});
				}

				if (error instanceof ZodError) {
					throw new Error(formatZodError(error));
				}
				throw error;
			}
		}),

	parseDocx: protectedProcedure
		.input(
			z.object({
				...aiCredentialsSchema.shape,
				file: fileInputSchema,
				mediaType: z.enum([
					"application/msword",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				]),
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.parseDocx(input);
			} catch (error) {
				console.error("[AI Parse Docx Error]", error);
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", {
						message: `AI Provider Error: ${error.message}`,
						data: { originalError: error },
					});
				}

				if (error instanceof ZodError) {
					throw new Error(formatZodError(error));
				}

				throw error;
			}
		}),

	improveContent: protectedProcedure
		.input(
			z.object({
				...aiCredentialsSchema.shape,
				...improveContentSchema.shape,
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.improveContent(input);
			} catch (error) {
				console.error("[AI Improve Content Error]", error);
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", {
						message: `AI Provider Error: ${error.message}`,
						data: { originalError: error },
					});
				}
				throw error;
			}
		}),
};
