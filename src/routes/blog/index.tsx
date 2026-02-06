import { t } from "@lingui/core/macro";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import articles from "@/content/blog/articles.json";
import type { Article } from "@/schema/article";

const allArticles: Article[] = articles as Article[];

export const Route = createFileRoute("/blog/")({
	component: BlogPage,
});

function BlogPage() {
	return (
		<main className="container mx-auto px-4 py-24 sm:px-6 lg:px-12">
			<div className="mb-12 text-center">
				<h1 className="mb-4 font-extrabold text-4xl tracking-tight sm:text-5xl lg:text-6xl">{t`Our Blog`}</h1>
				<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
					{t`Expert advice, resume tips, and career insights to help you land your dream job.`}
				</p>
			</div>

			<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
				{allArticles.length > 0 ? (
					allArticles.map((article) => (
						<Card key={article.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
							<div className="aspect-video w-full overflow-hidden">
								<img
									src={article.heroImage}
									alt={article.title}
									className="h-full w-full object-cover transition-transform hover:scale-105"
								/>
							</div>
							<CardHeader>
								<div className="mb-2 flex gap-2">
									{article.categories.map((category) => (
										<span
											key={category}
											className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary text-xs"
										>
											{category}
										</span>
									))}
								</div>
								<CardTitle className="line-clamp-2 leading-tight">
									<Link
										to="/blog/$slug"
										params={{ slug: article.slug }}
										className="transition-colors hover:text-primary"
									>
										{article.title}
									</Link>
								</CardTitle>
								<CardDescription className="mt-2 line-clamp-3">{article.excerpt}</CardDescription>
							</CardHeader>
							<CardFooter className="mt-auto border-t p-6">
								<div className="flex w-full items-center justify-between">
									<span className="text-muted-foreground text-sm">{new Date(article.date).toLocaleDateString()}</span>
									<Button asChild variant="ghost" size="sm" className="gap-2">
										<Link to="/blog/$slug" params={{ slug: article.slug }}>
											{t`Read More`} <ArrowRightIcon size={16} />
										</Link>
									</Button>
								</div>
							</CardFooter>
						</Card>
					))
				) : (
					<div className="col-span-full py-24 text-center">
						<p className="text-muted-foreground">{t`No articles found. Coming soon!`}</p>
					</div>
				)}
			</div>
		</main>
	);
}
