import { Trans } from "@lingui/react/macro";
import { cn } from "@/utils/style";

type Props = React.ComponentProps<"div">;

export function Copyright({ className, ...props }: Props) {
	return (
		<div className={cn("text-muted-foreground/80 text-xs leading-relaxed", className)} {...props}>
			<p>
				<Trans id="copyright.licensed-under">
					Licensed under{" "}
					<a
						href="https://github.com/jasonyy2018/rresume/blob/main/LICENSE"
						target="_blank"
						rel="noopener"
						className="font-medium underline underline-offset-2"
					>
						MIT
					</a>
					.
				</Trans>
			</p>

			<p>
				<Trans id="copyright.by-the-community">By the community, for the community.</Trans>
			</p>

			<p>
				<Trans id="copyright.maintained-by">
					Maintained by{" "}
					<a
						target="_blank"
						rel="noopener"
						href="https://github.com/jasonyy2018"
						className="font-medium underline underline-offset-2"
					>
						Jason Yu
					</a>
					.
				</Trans>
			</p>

			<p className="mt-4">Reactive Resume v{__APP_VERSION__}</p>
		</div>
	);
}
