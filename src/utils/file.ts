import { slugify } from "./string";

function getReadableTimestamp(now: Date) {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	const h = String(now.getHours()).padStart(2, "0");
	const min = String(now.getMinutes()).padStart(2, "0");

	return `${y}${m}${d}_${h}${min}`;
}

export function generateFilename(prefix: string, extension?: string) {
	const now = new Date();
	const name = slugify(prefix);
	const timestamp = getReadableTimestamp(now);

	return `${name}_${timestamp}${extension ? `.${extension}` : ""}`;
}

export function downloadWithAnchor(blob: Blob, filename: string) {
	const a = document.createElement("a");
	const url = URL.createObjectURL(blob);

	a.href = url;
	a.rel = "noopener";
	a.download = filename;

	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function downloadFromUrl(url: string, filename: string) {
	const response = await fetch(url);
	const blob = await response.blob();

	downloadWithAnchor(blob, filename);
}

/**
 * Safely converts a File to a base64 string.
 * Uses FileReader to avoid "Maximum call stack size exceeded" errors
 * that occur when using the spread operator on large byte arrays.
 */
export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			const result = reader.result as string;
			// Remove the "data:application/pdf;base64," prefix
			const base64 = result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = (error) => reject(error);
	});
}
