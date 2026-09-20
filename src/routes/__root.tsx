import { ClerkProvider, useUser } from "@clerk/tanstack-react-start";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import {
	PostHogErrorBoundary,
	PostHogProvider,
	usePostHog,
} from "posthog-js/react";
import { useEffect, useRef } from "react";
import Crosshair from "#/components/shared/Crosshair";
import Navbar from "../components/layouts/Navbar";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Skild – The registery for Agentic Intelligence",
			},
			{
				name: "description",
				content:
					"Discover, publish, and operate reusable agent capabilities from a route-driven workspace.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
	const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
	const app = (
		<ClerkProvider>
			{apiKey && apiHost ? <PostHogIdentity /> : null}
			<div id="root-layout">
				<header>
					<div className="frame">
						<Navbar />
						<Crosshair />
						<Crosshair />
					</div>
				</header>

				<main>
					<div className="frame">{children}</div>
				</main>
			</div>
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
					TanStackQueryDevtools,
				]}
			/>
		</ClerkProvider>
	);

	if (!apiKey || !apiHost) {
		if (import.meta.env.DEV) {
			const missingVariable = !apiKey
				? "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"
				: "VITE_PUBLIC_POSTHOG_HOST";
			throw new Error(
				`${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
			);
		}

		return (
			<html lang="en">
				<head>
					<HeadContent />
				</head>
				<body className="font-sans antialiased wrap-anywhere">
					{app}
					<Scripts />
				</body>
			</html>
		);
	}

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased wrap-anywhere">
				<PostHogProvider
					apiKey={apiKey}
					options={{ api_host: apiHost, capture_exceptions: true }}
				>
					<PostHogErrorBoundary>{app}</PostHogErrorBoundary>
				</PostHogProvider>
				<Scripts />
			</body>
		</html>
	);
}

function PostHogIdentity() {
	const posthog = usePostHog();
	const { isLoaded, isSignedIn, user } = useUser();
	const previousUserId = useRef<string | null>(null);

	useEffect(() => {
		if (!isLoaded) return;

		const userId = isSignedIn ? user?.id : null;
		if (!userId) {
			if (previousUserId.current) {
				posthog.reset();
				previousUserId.current = null;
			}
			return;
		}

		if (previousUserId.current && previousUserId.current !== userId) {
			posthog.reset();
		}

		if (previousUserId.current !== userId) {
			posthog.identify(userId, {
				email: user?.primaryEmailAddress?.emailAddress,
				name: user?.fullName ?? undefined,
			});
			previousUserId.current = userId;
		}
	}, [isLoaded, isSignedIn, posthog, user]);

	return null;
}
