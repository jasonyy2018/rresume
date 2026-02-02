import { Trans } from "@lingui/react/macro";
import { Button } from "@/components/ui/button";
import { SectionBase } from "../shared/section-base";

export function InformationSectionBuilder() {
	return (
		<SectionBase type="information" className="space-y-4">
			<div className="flex flex-wrap gap-0.5">
				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://github.com/jasonyy2018/rresume" target="_blank" rel="noopener">
						<Trans>Source Code</Trans>
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://github.com/jasonyy2018/rresume/issues" target="_blank" rel="noopener">
						<Trans>Report a Bug</Trans>
					</a>
				</Button>
			</div>
		</SectionBase>
	);
}
