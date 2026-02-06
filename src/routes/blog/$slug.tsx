import { t } from "@lingui/core/macro";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import articles from "@/content/blog/articles.json";
import type { Article } from "@/schema/article";

const allArticles: Article[] = articles as Article[];

export const Route = createFileRoute("/blog/$slug")({
	component: ArticlePage,
	head: ({ params }) => {
		const article = allArticles.find((a) => a.slug === params.slug);
		if (!article) return {};

		return {
			meta: [
				{ title: `${article.title} | Reactive Resume` },
				{ name: "description", content: article.excerpt },
				{ property: "og:title", content: article.title },
				{ property: "og:description", content: article.excerpt },
				{ property: "og:image", content: article.heroImage },
				{ property: "og:type", content: "article" },
				{ property: "twitter:title", content: article.title },
				{ property: "twitter:description", content: article.excerpt },
				{ property: "twitter:image", content: article.heroImage },
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BlogPosting",
						headline: article.title,
						image: [article.heroImage],
						datePublished: article.date,
						author: [
							{
								"@type": "Person",
								name: article.author.name,
							},
						],
					}),
				},
			],
		};
	},
});

function ArticlePage() {
	const { slug } = useParams({ from: "/blog/$slug" });
	const article = allArticles.find((a) => a.slug === slug);

	if (!article) {
		return (
			<div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4">
				<h1 className="font-bold text-2xl">{t`Article not found`}</h1>
				<Button asChild variant="link" className="mt-4">
					<Link to="/blog">
						<ArrowLeftIcon className="mr-2" size={16} /> {t`Back to Blog`}
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<article className="container mx-auto px-4 py-24 sm:px-6 lg:px-12">
			<Link
				to="/blog"
				className="mb-8 inline-flex items-center font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
			>
				<ArrowLeftIcon className="mr-2" size={16} /> {t`Back to Blog`}
			</Link>

			<header className="mb-12">
				<div className="mb-4 flex gap-2">
					{article.categories.map((category) => (
						<span
							key={category}
							className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary text-xs"
						>
							{category}
						</span>
					))}
				</div>
				<h1 className="mb-4 font-extrabold text-4xl tracking-tight sm:text-5xl lg:text-6xl">{article.title}</h1>
				<div className="flex items-center gap-4 text-muted-foreground">
					<span>{article.author.name}</span>
					<span>•</span>
					<span>{new Date(article.date).toLocaleDateString()}</span>
				</div>
			</header>

			<div className="mb-12 aspect-21/9 w-full overflow-hidden rounded-2xl">
				<img src={article.heroImage} alt={article.title} className="h-full w-full object-cover" />
			</div>

			<div className="prose prose-lg dark:prose-invert mx-auto max-w-4xl">
				<div dangerouslySetInnerHTML={{ __html: article.content }} />
			</div>

			<footer className="mt-16 border-t pt-12">
				<div className="flex flex-wrap gap-2">
					{article.tags.map((tag) => (
						<span key={tag} className="rounded-md bg-secondary px-3 py-1 font-medium text-sm">
							#{tag}
						</span>
					))}
				</div>
			</footer>
		</article>
	);
}
