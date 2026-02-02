import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, TrashSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { ColorPicker } from "@/components/input/color-picker";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { orpc } from "@/integrations/orpc/client";
import { pictureSchema } from "@/schema/resume/data";
import getCroppedImg from "@/utils/crop-image";
import { SectionBase } from "../shared/section-base";

export function PictureSectionBuilder() {
	return (
		<SectionBase type="picture">
			<PictureSectionForm />
		</SectionBase>
	);
}

function PictureSectionForm() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [isCropOpen, setIsCropOpen] = useState(false);

	const picture = useResumeStore((state) => state.resume.data.picture);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const { mutate: uploadFile } = useMutation(orpc.storage.uploadFile.mutationOptions({ meta: { noInvalidate: true } }));
	const { mutate: deleteFile } = useMutation(orpc.storage.deleteFile.mutationOptions({ meta: { noInvalidate: true } }));

	const form = useForm({
		resolver: zodResolver(pictureSchema),
		defaultValues: picture,
		mode: "onChange",
	});

	const onSubmit = (data: z.infer<typeof pictureSchema>) => {
		updateResumeData((draft) => {
			draft.picture = data;
		});
	};

	const onSelectPicture = () => {
		if (!fileInputRef.current) return;
		fileInputRef.current?.click();
	};

	const onDeletePicture = () => {
		if (!picture.url) return;

		const appOrigin = window.location.origin;
		const pictureOrigin = new URL(picture.url).origin;

		const filename = picture.url.split("/").pop();
		if (!filename) return;

		// If the picture is from the same origin, attempt to delete it
		if (pictureOrigin === appOrigin) deleteFile({ filename });

		form.setValue("url", "", { shouldDirty: true });
		form.handleSubmit(onSubmit)();
	};

	const onUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const file = e.target.files[0];
			const imageDataUrl = await readFile(file);
			setImageSrc(imageDataUrl);
			setIsCropOpen(true);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleSaveCroppedImage = async () => {
		if (!imageSrc || !croppedAreaPixels) return;

		const toastId = toast.loading(t`Uploading picture...`);

		try {
			const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
			if (!croppedImageBlob) throw new Error("Failed to crop image");

			const file = new File([croppedImageBlob], "profile.jpg", { type: "image/jpeg" });

			uploadFile(file, {
				onSuccess: ({ url }) => {
					form.setValue("url", url, { shouldDirty: true });
					form.handleSubmit(onSubmit)();
					toast.dismiss(toastId);
					setIsCropOpen(false);
					setImageSrc(null); // Reset
				},
				onError: (error) => {
					toast.error(error.message, { id: toastId });
				},
			});
		} catch (e) {
			toast.error(t`Failed to crop image`, { id: toastId });
			console.error(e);
		}
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="flex items-center gap-x-4">
					<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadPicture} />

					<div
						onClick={picture.url ? onDeletePicture : onSelectPicture}
						className="group/picture relative size-18 cursor-pointer overflow-hidden rounded-md bg-secondary transition-colors hover:bg-secondary/50"
					>
						{picture.url && (
							<img
								alt=""
								src={picture.url}
								className="fade-in relative z-10 size-full animate-in rounded-md object-cover transition-opacity group-hover/picture:opacity-20"
							/>
						)}

						<div className="absolute inset-0 z-0 flex size-full items-center justify-center">
							{picture.url ? <TrashSimpleIcon className="size-6" /> : <UploadSimpleIcon className="size-6" />}
						</div>
					</div>

					<FormField
						control={form.control}
						name="url"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>
									<Trans>URL</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-2">
									<FormControl>
										<Input {...field} />
									</FormControl>

									<Button
										size="icon"
										variant="ghost"
										onClick={() => {
											form.setValue("hidden", !picture.hidden, { shouldDirty: true });
											form.handleSubmit(onSubmit)();
										}}
									>
										{picture.hidden ? <EyeSlashIcon /> : <EyeIcon />}
									</Button>
								</div>
							</FormItem>
						)}
					/>
				</div>

				<div className="grid @md:grid-cols-2 grid-cols-1 gap-4">
					<FormField
						control={form.control}
						name="size"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Size</Trans>
								</FormLabel>
								<InputGroup>
									<InputGroupInput
										{...field}
										type="number"
										min={32}
										max={512}
										step={1}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.onChange("");
											else field.onChange(Number(value));
										}}
									/>

									<InputGroupAddon align="inline-end">
										<InputGroupText>pt</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="rotation"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Rotation</Trans>
								</FormLabel>
								<InputGroup>
									<FormControl>
										<InputGroupInput
											{...field}
											type="number"
											min={0}
											max={360}
											step={5}
											onChange={(e) => {
												const value = e.target.value;
												if (value === "") field.onChange("");
												else field.onChange(Number(value));
											}}
										/>
									</FormControl>
									<InputGroupAddon align="inline-end">
										<InputGroupText>°</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="aspectRatio"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Aspect Ratio</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-2">
									<FormControl>
										<Input
											{...field}
											type="number"
											min={0.5}
											max={2.5}
											step={0.1}
											onChange={(e) => {
												const value = e.target.value;
												if (value === "") field.onChange("");
												else field.onChange(Number(value));
											}}
										/>
									</FormControl>

									<ButtonGroup className="shrink-0">
										<Button
											size="icon"
											variant="outline"
											title={t`Square`}
											onClick={() => {
												field.onChange(1);
												form.handleSubmit(onSubmit)();
											}}
										>
											<div className="aspect-square min-h-3 min-w-3 border border-primary" />
										</Button>
										<Button
											size="icon"
											variant="outline"
											title={t`Landscape`}
											onClick={() => {
												field.onChange(1.5);
												form.handleSubmit(onSubmit)();
											}}
										>
											<div className="aspect-[1.5/1] min-h-3 min-w-3 border border-primary" />
										</Button>
										<Button
											size="icon"
											variant="outline"
											title={t`Portrait`}
											onClick={() => {
												field.onChange(0.5);
												form.handleSubmit(onSubmit)();
											}}
										>
											<div className="aspect-[1/1.5] min-h-3 min-w-3 border border-primary" />
										</Button>
									</ButtonGroup>
								</div>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="borderRadius"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Border Radius</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-2">
									<InputGroup>
										<FormControl>
											<InputGroupInput
												{...field}
												type="number"
												min={0}
												max={100}
												step={1}
												onChange={(e) => {
													const value = Number(e.target.value);
													field.onChange(value);
												}}
											/>
										</FormControl>
										<InputGroupAddon align="inline-end">pt</InputGroupAddon>
									</InputGroup>

									<ButtonGroup className="shrink-0">
										<Button
											size="icon"
											variant="outline"
											title="0pt"
											onClick={() => {
												field.onChange(0);
												form.handleSubmit(onSubmit)();
											}}
										>
											<div className="size-3 rounded-none border border-primary" />
										</Button>
										<Button
											size="icon"
											variant="outline"
											title="10pt"
											onClick={() => {
												field.onChange(10);
												form.handleSubmit(onSubmit)();
											}}
										>
											<div className="size-3 rounded-[10%] border border-primary" />
										</Button>
										<Button
											size="icon"
											variant="outline"
											title="100pt"
											onClick={() => {
												field.onChange(100);
												form.handleSubmit(onSubmit)();
											}}
										>
											<div className="size-3 rounded-full border border-primary" />
										</Button>
									</ButtonGroup>
								</div>
							</FormItem>
						)}
					/>

					<div className="flex items-center gap-x-2">
						<FormField
							control={form.control}
							name="borderColor"
							render={({ field }) => (
								<FormItem className="shrink-0 self-end">
									<FormControl>
										<ColorPicker
											defaultValue={field.value}
											onValueChange={(color) => {
												field.onChange(color);
												form.handleSubmit(onSubmit)();
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="borderWidth"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>
										<Trans>Border Width</Trans>
									</FormLabel>
									<InputGroup>
										<FormControl>
											<InputGroupInput
												{...field}
												type="number"
												min={0}
												step={1}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") field.onChange("");
													else field.onChange(Number(value));
												}}
											/>
										</FormControl>
										<InputGroupAddon align="inline-end">
											<InputGroupText>pt</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
								</FormItem>
							)}
						/>
					</div>

					<div className="flex items-center gap-x-2">
						<FormField
							control={form.control}
							name="shadowColor"
							render={({ field }) => (
								<FormItem className="shrink-0 self-end">
									<FormControl>
										<ColorPicker
											defaultValue={field.value}
											onValueChange={(color) => {
												field.onChange(color);
												form.handleSubmit(onSubmit)();
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="shadowWidth"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>
										<Trans>Shadow Width</Trans>
									</FormLabel>
									<InputGroup>
										<FormControl>
											<InputGroupInput
												{...field}
												type="number"
												min={0}
												step={0.5}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") field.onChange("");
													else field.onChange(Number(value));
												}}
											/>
										</FormControl>
										<InputGroupAddon align="inline-end">
											<InputGroupText>pt</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
								</FormItem>
							)}
						/>
					</div>
				</div>
			</form>

			<Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>
							<Trans>Crop Picture</Trans>
						</DialogTitle>
						<DialogDescription>
							<Trans>Adjust the picture to your liking.</Trans>
						</DialogDescription>
					</DialogHeader>

					{imageSrc && (
						<div className="relative h-64 w-full overflow-hidden rounded-md bg-zinc-900/50 sm:h-80">
							<Cropper
								image={imageSrc}
								crop={crop}
								zoom={zoom}
								aspect={1}
								onCropChange={setCrop}
								onCropComplete={onCropComplete}
								onZoomChange={setZoom}
							/>
						</div>
					)}

					<div className="space-y-2">
						<div className="flex justify-between text-muted-foreground text-xs">
							<Trans>Zoom</Trans>
							<span>{zoom.toFixed(1)}x</span>
						</div>
						<Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} />
					</div>

					<DialogFooter>
						<Button variant="ghost" onClick={() => setIsCropOpen(false)}>
							<Trans>Cancel</Trans>
						</Button>
						<Button onClick={handleSaveCroppedImage}>
							<Trans>Save & Upload</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Form>
	);
}

function readFile(file: File): Promise<string> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => resolve(reader.result as string), false);
		reader.readAsDataURL(file);
	});
}
