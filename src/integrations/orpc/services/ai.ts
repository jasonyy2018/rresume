import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { ORPCError } from "@orpc/server";
import { AISDKError, createGateway, generateText, Output } from "ai";
import { createOllama } from "ai-sdk-ollama";
import { match } from "ts-pattern";
import type { ZodError } from "zod";
import z, { flattenError } from "zod";
import docxParserSystemPrompt from "@/integrations/ai/prompts/docx-parser-system.md?raw";
import docxParserUserPrompt from "@/integrations/ai/prompts/docx-parser-user.md?raw";
import improveContentPrompt from "@/integrations/ai/prompts/improve-content.md?raw";
import pdfParserSystemPrompt from "@/integrations/ai/prompts/pdf-parser-system.md?raw";
import pdfParserUserPrompt from "@/integrations/ai/prompts/pdf-parser-user.md?raw";
import type { ResumeData } from "@/schema/resume/data";
import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";

export const aiProviderSchema = z.enum([
	"ollama",
	"openai",
	"gemini",
	"anthropic",
	"vercel-ai-gateway",
	"cerebras",
	"siliconflow",
]);

export type AIProvider = z.infer<typeof aiProviderSchema>;

export type GetModelInput = {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseURL: string;
};

function getModel(input: GetModelInput) {
	const { provider, model, apiKey } = input;
	const baseURL = input.baseURL || undefined;

	return match(provider)
		.with("openai", () => createOpenAI({ apiKey, baseURL }).chat(model))
		.with("ollama", () => createOllama({ apiKey, baseURL }).languageModel(model))
		.with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
		.with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
		.with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
		.with("cerebras", () => {
			console.log("[Cerebras Config]", {
				apiKey: `${apiKey?.substring(0, 5)}...`,
				baseURL: baseURL || "https://api.cerebras.ai/v1",
				model,
			});
			const openai = createOpenAI({
				apiKey,
				baseURL: baseURL || "https://api.cerebras.ai/v1",
			});
			return openai.chat(model);
		})
		.with("siliconflow", () =>
			createOpenAI({
				apiKey,
				baseURL: baseURL || "https://api.siliconflow.cn/v1",
			}).chat(model),
		)
		.exhaustive();
}

export const aiCredentialsSchema = z.object({
	provider: aiProviderSchema,
	model: z.string(),
	apiKey: z.string(),
	baseURL: z.string(),
});

export const improveContentSchema = z.object({
	content: z.string(),
	jobDescription: z.string().optional(),
	instructions: z.string().optional(),
});

export const fileInputSchema = z.object({
	name: z.string(),
	data: z.string(), // base64 encoded
});

export type TestConnectionInput = z.infer<typeof aiCredentialsSchema>;

export async function testConnection(input: TestConnectionInput): Promise<boolean> {
	const RESPONSE_OK = "1";

	console.log("[AI Test Connection] Starting...", { provider: input.provider, model: input.model });

	try {
		console.log("[AI Test Connection] Sending request...");

		// Simple text check instead of structured output (Output.choice) for better compatibility
		const result = await generateText({
			model: getModel(input),
			messages: [{ role: "user", content: `Respond with only the number "${RESPONSE_OK}".` }],
			abortSignal: AbortSignal.timeout(30000), // 30s timeout
		});

		console.log("[AI Test Connection] Result received:", {
			text: result.text,
			usage: result.usage,
			finishReason: result.finishReason,
		});

		return result.text.trim().includes(RESPONSE_OK);
	} catch (error) {
		console.error("[AI Test Connection] Caught Error:", {
			name: error instanceof Error ? error.name : "Unknown",
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}

export type ParsePdfInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
};

export async function parsePdf(input: ParsePdfInput): Promise<ResumeData> {
	const isSupportedProvider = ["openai", "gemini"].includes(input.provider);
	const isSiliconFlow = input.provider === "siliconflow";
	const isNonOpenAIURL = input.provider === "openai" && input.baseURL && !input.baseURL.includes("api.openai.com");

	if (!isSupportedProvider || isNonOpenAIURL || isSiliconFlow) {
		throw new ORPCError("BAD_REQUEST", {
			message: `The provider "${input.provider}" (with baseURL "${input.baseURL}") does not support PDF parsing. This feature requires official OpenAI or Google Gemini.`,
		});
	}

	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	const decodedData = Buffer.from(input.file.data, "base64");
	if (decodedData.length > MAX_FILE_SIZE) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The PDF file is too large. Please upload a file smaller than 10MB.",
		});
	}

	console.log(
		`[AI Parse PDF] Starting parsing: ${input.file.name} (${decodedData.length} bytes) using ${input.provider}/${input.model}`,
	);
	const startTime = Date.now();
	const model = getModel(input);

	try {
		const result = await generateText({
			model,
			output: Output.object({ schema: resumeDataSchema }),
			messages: [
				{
					role: "system",
					content: pdfParserSystemPrompt,
				},
				{
					role: "user",
					content: [
						{ type: "text", text: pdfParserUserPrompt },
						{
							type: "file",
							filename: input.file.name,
							mediaType: "application/pdf",
							data: input.file.data,
						},
					],
				},
			],
		});

		console.log(`[AI Parse PDF] Successfully parsed PDF in ${Date.now() - startTime}ms`);
		return resumeDataSchema.parse({
			...result.output,
			customSections: [],
			picture: defaultResumeData.picture,
			metadata: defaultResumeData.metadata,
		});
	} catch (error) {
		console.error("[AI Parse PDF Error]", error);
		if (error instanceof AISDKError) {
			throw new ORPCError("BAD_GATEWAY", {
				message: `AI Provider Error: ${error.message}`,
				data: { originalError: error },
			});
		}
		throw error;
	}
}

export type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
	mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

export async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
	const isSupportedProvider = ["openai", "gemini"].includes(input.provider);
	const isSiliconFlow = input.provider === "siliconflow";
	const isNonOpenAIURL = input.provider === "openai" && input.baseURL && !input.baseURL.includes("api.openai.com");

	if (!isSupportedProvider || isNonOpenAIURL || isSiliconFlow) {
		throw new ORPCError("BAD_REQUEST", {
			message: `The provider "${input.provider}" (with baseURL "${input.baseURL}") does not support Word document parsing. This feature requires official OpenAI or Google Gemini.`,
		});
	}

	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	const decodedData = Buffer.from(input.file.data, "base64");
	if (decodedData.length > MAX_FILE_SIZE) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The Word document is too large. Please upload a file smaller than 10MB.",
		});
	}

	console.log(
		`[AI Parse Docx] Starting parsing: ${input.file.name} (${decodedData.length} bytes) using ${input.provider}/${input.model}`,
	);
	const startTime = Date.now();
	const model = getModel(input);

	try {
		const result = await generateText({
			model,
			output: Output.object({ schema: resumeDataSchema }),
			messages: [
				{ role: "system", content: docxParserSystemPrompt },
				{
					role: "user",
					content: [
						{ type: "text", text: docxParserUserPrompt },
						{
							type: "file",
							filename: input.file.name,
							mediaType: input.mediaType,
							data: input.file.data,
						},
					],
				},
			],
		});

		console.log(`[AI Parse Docx] Successfully parsed Docx in ${Date.now() - startTime}ms`);
		return resumeDataSchema.parse({
			...result.output,
			customSections: [],
			picture: defaultResumeData.picture,
			metadata: defaultResumeData.metadata,
		});
	} catch (error) {
		console.error("[AI Parse Docx Error]", error);
		if (error instanceof AISDKError) {
			throw new ORPCError("BAD_GATEWAY", {
				message: `AI Provider Error: ${error.message}`,
				data: { originalError: error },
			});
		}
		throw error;
	}
}

export type ImproveContentInput = z.infer<typeof aiCredentialsSchema> & z.infer<typeof improveContentSchema>;

export async function improveContent(input: ImproveContentInput): Promise<string> {
	const model = getModel(input);

	const systemPrompt = improveContentPrompt
		.replace("{{content}}", input.content)
		.replace("{{jobDescription}}", input.jobDescription || "Not provided")
		.replace("{{instruction}}", input.instructions || "Not provided");

	const result = await generateText({
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{
				role: "user",
				content: "Please improve the content as instructed in the system prompt.",
			},
		],
	});

	if (!result.text) {
		throw new Error("Failed to improve content");
	}

	return result.text;
}

export function formatZodError(error: ZodError): string {
	return JSON.stringify(flattenError(error));
}

export const aiService = {
	testConnection,
	parsePdf,
	parseDocx,
	improveContent,
};
