import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { mainnet, base } from "wagmi/chains";
// import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { okxWallet } from "./okx-connector";

export function getConfig() {
	return createConfig({
		chains: [base],
		// connectors: [
		// 	injected(),
		// 	coinbaseWallet(),
		// 	walletConnect({
		// 		projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID as string,
		// 	}),
		// ],
		connectors: [okxWallet()],
		storage: createStorage({
			storage: cookieStorage,
		}),
		ssr: true,
		transports: {
			[base.id]: http(),
		},
	});
}

declare module "wagmi" {
	interface Register {
		config: ReturnType<typeof getConfig>;
	}
}
