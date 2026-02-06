import "@fontsource-variable/ibm-plex-sans";
import "@phosphor-icons/web/regular/style.css";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { IconContext } from "@phosphor-icons/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { CommandPalette } from "@/components/command-palette";
import { BreakpointIndicator } from "@/components/layout/breakpoint-indicator";
import { ThemeProvider } from "@/components/theme/provider";
import { Toaster } from "@/components/ui/sonner";
import { DialogManager } from "@/dialogs/manager";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";
import { PromptDialogProvider } from "@/hooks/use-prompt";
import { getSession } from "@/integrations/auth/functions";
import type { AuthSession } from "@/integrations/auth/types";
import { client, type orpc } from "@/integrations/orpc/client";
import type { FeatureFlags } from "@/integrations/orpc/services/flags";
import { getLocale, isRTL, type Locale, loadLocale } from "@/utils/locale";
import { getTheme, type Theme } from "@/utils/theme";
import appCss from "../styles/globals.css?url";

type RouterContext = {
	theme: Theme;
	locale: Locale;
	orpc: typeof orpc;
	queryClient: QueryClient;
	session: AuthSession | null;
	flags: FeatureFlags;
};

const appName = "Reactive Resume";
const tagline = "A free and open-source resume builder";
const title = `${appName} — ${tagline}`;
const description =
	"Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume.";

await loadLocale(await getLocale());

export const Route = createRootRouteWithContext<RouterContext>()({
	shellComponent: RootDocument,
	head: () => {
		const appUrl = process.env.APP_URL ?? "https://rdes.togomol.com/";

		return {
			links: [
				{ rel: "stylesheet", href: appCss },
				// Icons
				{ rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "128x128" },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "256x256 any" },
				{ rel: "apple-touch-icon", href: "/apple-touch-icon-180x180.png", type: "image/png", sizes: "180x180 any" },
				// Manifest
				{ rel: "manifest", href: "/manifest.webmanifest", crossOrigin: "use-credentials" },
			],
			meta: [
				{ title },
				{ charSet: "UTF-8" },
				{ name: "description", content: description },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{
					name: "keywords",
					content:
						"resume builder, curriculum vitae, cv, careers, job applications, free resume builder, open source resume builder, ai resume, professional resume",
				},
				{ name: "author", content: appName },
				// Twitter Tags
				{ property: "twitter:image", content: `${appUrl}/opengraph/banner.jpg` },
				{ property: "twitter:card", content: "summary_large_image" },
				{ property: "twitter:title", content: title },
				{ property: "twitter:description", content: description },
				// OpenGraph Tags
				{ property: "og:image", content: `${appUrl}/opengraph/banner.jpg` },
				{ property: "og:site_name", content: appName },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: appUrl },
				{ property: "og:type", content: "website" },
			],
			// Register service worker and SEO scripts
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "Organization",
						name: appName,
						url: appUrl,
						logo: `${appUrl}/favicon.svg`,
						sameAs: ["https://github.com/AmruthPillai/Reactive-Resume"],
						description: description,
					}),
				},
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "WebSite",
						name: appName,
						url: appUrl,
						potentialAction: {
							"@type": "SearchAction",
							target: `${appUrl}/search?q={search_term_string}`,
							"query-input": "required name=search_term_string",
						},
					}),
				},
				{
					children: `
						if('serviceWorker' in navigator) {
							window.addEventListener('load', () => {
								navigator.serviceWorker.register('/sw.js', { scope: '/' })
							})
						}
					`,
				},
				{
					children: `
						var _paq = window._paq = window._paq || [];
						_paq.push(['trackPageView']);
						_paq.push(['enableLinkTracking']);
						(function() {
							var u="//matomo.wisdomitc.com/";
							_paq.push(['setTrackerUrl', u+'matomo.php']);
							_paq.push(['setSiteId', '7']);
							var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
							g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
						})();
					`,
				},
			],
		};
	},
	beforeLoad: async () => {
		const [theme, locale, session, flags] = await Promise.all([
			getTheme(),
			getLocale(),
			getSession(),
			client.flags.get(),
		]);

		return { theme, locale, session, flags };
	},
});

type Props = {
	children: React.ReactNode;
};

function RootDocument({ children }: Props) {
	const { theme, locale } = Route.useRouteContext();
	const dir = isRTL(locale) ? "rtl" : "ltr";

	return (
		<html suppressHydrationWarning dir={dir} lang={locale} className={theme}>
			<head>
				<HeadContent />
			</head>

			<body>
				<MotionConfig reducedMotion="user">
					<I18nProvider i18n={i18n}>
						<IconContext.Provider value={{ size: 16, weight: "regular" }}>
							<ThemeProvider theme={theme}>
								<ConfirmDialogProvider>
									<PromptDialogProvider>
										{children}

										<DialogManager />
										<CommandPalette />
										<Toaster richColors position="bottom-right" />

										{import.meta.env.DEV && <BreakpointIndicator />}
									</PromptDialogProvider>
								</ConfirmDialogProvider>
							</ThemeProvider>
						</IconContext.Provider>
					</I18nProvider>
				</MotionConfig>

				<Scripts />
			</body>
		</html>
	);
}
