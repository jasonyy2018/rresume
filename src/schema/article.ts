import { z } from "zod";

export const articleSchema = z.object({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	excerpt: z.string(),
	content: z.string(),
	heroImage: z.string().url(),
	date: z.string(),
	author: z.object({
		name: z.string(),
		avatar: z.string().optional(),
	}),
	categories: z.array(z.string()),
	tags: z.array(z.string()),
	seo: z.object({
		title: z.string().optional(),
		description: z.string().optional(),
		keywords: z.array(z.string()).optional(),
	}),
});

export type Article = z.infer<typeof articleSchema>;
