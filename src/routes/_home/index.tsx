import { createFileRoute } from "@tanstack/react-router";
import { Features } from "./-sections/features";
import { Hero } from "./-sections/hero";
import { Statistics } from "./-sections/statistics";
import { Templates } from "./-sections/templates";
import { Testimonials } from "./-sections/testimonials";

export const Route = createFileRoute("/_home/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main id="main-content" className="relative">
			<Hero />

			<div className="container mx-auto px-4 sm:px-6 lg:px-12">
				<div className="border-border border-x [&>section:first-child]:border-t-0 [&>section]:border-border [&>section]:border-t">
					<Statistics />
					<Features />
					<Templates />
					<Testimonials />
					<Testimonials />
				</div>
			</div>
		</main>
	);
}
