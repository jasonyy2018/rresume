import { z } from "zod";

const baseSectionSchema = z.object({
	title: z.string().catch("").describe("The title of the section."),
	columns: z.number().catch(1).describe("The number of columns the section should span across."),
	hidden: z.boolean().catch(false).describe("Whether to hide the section from the resume."),
});

const profilesSectionSchema = baseSectionSchema.extend({
	items: z.array(z.object({ network: z.string() })).describe("The items to display in the profiles section."),
});

const sectionsSchema = z.object({
	profiles: profilesSectionSchema.catch({ title: "", columns: 1, hidden: false, items: [] as any }),
});

const resumeDataSchema = z.object({
	sections: sectionsSchema.catch({ profiles: { title: "", columns: 1, hidden: false, items: [] } } as any),
});

try {
	// Test 1: Missing items in profiles
	console.log("Test 1: Missing items in profiles");
	const result1 = resumeDataSchema.parse({
		sections: {
			profiles: { title: "Test" }, // missing items
		},
	});
	console.log("Result 1:", JSON.stringify(result1));

	// Test 2: Invalid sections type
	console.log("\nTest 2: Invalid sections type");
	const result2 = resumeDataSchema.parse({
		sections: "not an object",
	});
	console.log("Result 2:", JSON.stringify(result2));

	// Test 3: Multiple undefineds?
} catch (error) {
	if (error instanceof z.ZodError) {
		console.log("Zod Error:", JSON.stringify(error.flatten()));
	} else {
		console.error("Unknown error:", error);
	}
}
