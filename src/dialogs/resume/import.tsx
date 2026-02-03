import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, FileIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { useAIStore } from "@/integrations/ai/store";
import { JSONResumeImporter } from "@/integrations/import/json-resume";
import { ReactiveResumeJSONImporter } from "@/integrations/import/reactive-resume-json";
import { ReactiveResumeV4JSONImporter } from "@/integrations/import/reactive-resume-v4-json";
import { client, orpc } from "@/integrations/orpc/client";
import type { ResumeData } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("") }),
	z.object({
		type: z.literal("pdf"),
		file: z.instanceof(File).refine((file) => file.type === "application/pdf", { message: "File must be a PDF" }),
	}),
	z.object({
		type: z.literal("docx"),
		file: z
			.instanceof(File)
			.refine(
				(file) =>
					file.type === "application/msword" ||
					file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				{ message: "File must be a Microsoft Word document" },
			),
	}),
	z.object({
		type: z.literal("reactive-resume-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("reactive-resume-v4-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("json-resume-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
]);

type FormValues = z.infer<typeof formSchema>;

/**
 * Safely converts a File to a base64 string.
 * Uses FileReader to avoid "Maximum call stack size exceeded" errors
 * that occur when using the spread operator on large byte arrays.
 */
function convertFileToBase64(file: File): Promise<string> {
	console.log("[convertFileToBase64] Converting file (local):", file.name);
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			const result = reader.result as string;
			// Remove the "data:application/pdf;base64," prefix
			const base64 = result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = (error) => {
			console.error("[convertFileToBase64] Error converting file:", error);
			reject(error);
		};
	});
}

export function ImportResumeDialog(_: DialogProps<"resume.import">) {
	const { enabled: isAIEnabled, provider, model, apiKey, baseURL } = useAIStore();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const prevTypeRef = useRef<string>("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const { mutateAsync: importResume } = useMutation(orpc.resume.import.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			type: "",
		},
	});

	const type = useWatch({ control: form.control, name: "type" });

	useEffect(() => {
		if (prevTypeRef.current === type) return;
		prevTypeRef.current = type;
		form.resetField("file");
	}, [form.resetField, type]);

	const onSelectFile = () => {
		if (!inputRef.current) return;
		inputRef.current.click();
	};

	const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		form.setValue("file", file, { shouldDirty: true });
	};

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = async (values: FormValues) => {
		if (values.type === "") return;

		setIsLoading(true);

		const toastId = toast.loading(t`Importing your resume...`, {
			description: t`This may take multiple minutes, depending on the response of the AI provider. Please do not close the window or refresh the page.`,
		});

		try {
			let data: ResumeData | undefined;

			if (values.type === "json-resume-json") {
				const json = await values.file.text();
				const importer = new JSONResumeImporter();
				data = importer.parse(json);
			}

			if (values.type === "reactive-resume-json") {
				const json = await values.file.text();
				const importer = new ReactiveResumeJSONImporter();
				data = importer.parse(json);
			}

			if (values.type === "reactive-resume-v4-json") {
				const json = await values.file.text();
				const importer = new ReactiveResumeV4JSONImporter();
				data = importer.parse(json);
			}

			if (values.type === "pdf") {
				if (!isAIEnabled)
					throw new Error(t`This feature requires AI Integration to be enabled. Please enable it in the settings.`);

				const base64 = await convertFileToBase64(values.file);

				data = await client.ai.parsePdf({
					provider,
					model,
					apiKey,
					baseURL,
					file: { name: values.file.name, data: base64 },
				});
			}

			if (values.type === "docx") {
				if (!isAIEnabled)
					throw new Error(t`This feature requires AI Integration to be enabled. Please enable it in the settings.`);

				const base64 = await convertFileToBase64(values.file);
				const mediaType =
					values.file.type === "application/msword"
						? ("application/msword" as const)
						: ("application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const);

				data = await client.ai.parseDocx({
					provider,
					model,
					apiKey,
					baseURL,
					mediaType,
					file: { name: values.file.name, data: base64 },
				});
			}

			if (!data) throw new Error("No data was returned from the AI provider.");

			await importResume({ data });
			toast.success(t`Your resume has been imported successfully.`, { id: toastId, description: null });
			closeDialog();
		} catch (error: unknown) {
			console.error("[Import Resume Error]", error);

			let message = t`An unknown error occurred while importing your resume.`;
			let description: string | null = null;

			if (error && typeof error === "object") {
				const errorObj = error as Record<string, unknown>;
				// Handle ORPC / HTTP errors
				if ("message" in errorObj) message = String(errorObj.message);
				if ("status" in errorObj && errorObj.status === 502) {
					message = t`Bad Gateway (502)`;
					description = t`The server took too long to respond or encountered an error. Please try again with a smaller file or a different AI provider.`;
				}
				if ("data" in errorObj && errorObj.data && typeof errorObj.data === "object") {
					const dataObj = errorObj.data as Record<string, unknown>;
					if ("message" in dataObj) description = String(dataObj.message);
				}
			}

			toast.error(message, { id: toastId, description });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<DownloadSimpleIcon />
					<Trans id="import.title">Import an existing resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Continue where you left off by importing an existing resume you created using Reactive Resume or any another
						resume builder. Supported formats include PDF, Microsoft Word, as well as JSON files from Reactive Resume.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans id="import.type">Type</Trans>
								</FormLabel>
								<FormControl>
									<div className="space-y-2">
										<Combobox
											clearable={false}
											value={field.value}
											onValueChange={field.onChange}
											options={[
												{ value: "reactive-resume-json", label: "Reactive Resume (JSON)" },
												{ value: "reactive-resume-v4-json", label: "Reactive Resume v4 (JSON)" },
												{ value: "json-resume-json", label: "JSON Resume" },
												{
													value: "pdf",
													label: (
														<div className="flex items-center gap-x-2">
															PDF <Badge>{t({ id: "import.ai", message: "AI" })}</Badge>
														</div>
													),
												},
												{
													value: "docx",
													label: (
														<div className="flex items-center gap-x-2">
															Microsoft Word <Badge>{t({ id: "import.ai", message: "AI" })}</Badge>
														</div>
													),
												},
											]}
										/>

										{(field.value === "pdf" || field.value === "docx") && !["openai", "gemini"].includes(provider) && (
											<p className="text-warning text-xs">
												<Trans>
													Your current AI provider ({provider}) might not support PDF/Word parsing. Please use OpenAI or
													Gemini for best results.
												</Trans>
											</p>
										)}
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						key={type}
						control={form.control}
						name="file"
						render={({ field }) => (
							<FormItem className={cn(!type && "hidden")}>
								<FormControl>
									<div>
										<Input type="file" className="hidden" ref={inputRef} onChange={onUploadFile} />

										<Button
											variant="outline"
											className="h-auto w-full flex-col border-dashed py-8 font-normal"
											onClick={onSelectFile}
										>
											{field.value ? (
												<>
													<FileIcon weight="thin" size={32} />
													<p>{field.value.name}</p>
												</>
											) : (
												<>
													<UploadSimpleIcon weight="thin" size={32} />
													<Trans id="import.click-to-select">Click here to select a file to import</Trans>
												</>
											)}
										</Button>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter>
						<Button type="submit" disabled={!type || isLoading}>
							{isLoading ? <Spinner /> : null}
							{isLoading
								? t({ id: "import.importing", message: "Importing..." })
								: t({ id: "import.action", message: "Import (Action)" })}
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}
